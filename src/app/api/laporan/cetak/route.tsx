import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payments, bills, customers, users, appSettings } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { LaporanDocument } from "@/lib/pdf-laporan";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const collectorId = searchParams.get("collectorId") || "";

  const conditions = [];

  if (session.user.role === "collector") {
    conditions.push(eq(payments.collectorId, session.user.id));
  } else if (collectorId) {
    conditions.push(eq(payments.collectorId, collectorId));
  }

  if (startDate) {
    conditions.push(gte(payments.paymentDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(payments.paymentDate, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, summaryResult] = await Promise.all([
    db
      .select({
        amountPaid: payments.amountPaid,
        paymentDate: payments.paymentDate,
        paymentMethod: payments.paymentMethod,
        collectorName: users.name,
        invoiceNumber: bills.invoiceNumber,
        customerName: customers.name,
      })
      .from(payments)
      .innerJoin(bills, eq(payments.billId, bills.id))
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .leftJoin(users, eq(payments.collectorId, users.id))
      .where(whereClause)
      .orderBy(desc(payments.paymentDate)),
    db
      .select({ total: sql<number>`coalesce(sum(${payments.amountPaid}), 0)::int` })
      .from(payments)
      .where(whereClause),
  ]);

  const [settings] = await db.select().from(appSettings).limit(1);

  const totalAmount = summaryResult[0]?.total ?? 0;

  const pdfBuffer = await renderToBuffer(
    <LaporanDocument
      data={{
        appName: settings?.appName || "Bill BumdesNET",
        bumdesAddress: settings?.bumdesAddress || "",
        startDate: startDate || new Date().toISOString().split("T")[0],
        endDate: endDate || new Date().toISOString().split("T")[0],
        payments: data.map((p) => ({
          paymentDate: p.paymentDate,
          customerName: p.customerName,
          invoiceNumber: p.invoiceNumber,
          amountPaid: p.amountPaid,
          paymentMethod: p.paymentMethod,
          collectorName: p.collectorName || "-",
        })),
        totalAmount,
      }}
    />
  );

  const filename = `laporan-pembayaran-${startDate || "all"}-${endDate || "all"}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}

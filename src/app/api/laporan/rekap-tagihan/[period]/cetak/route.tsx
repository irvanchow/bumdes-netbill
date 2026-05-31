import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bills, customers, internetPackages, payments, users, appSettings } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { RekapTagihanDetailDocument } from "@/lib/pdf-rekap-tagihan-detail";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ period: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { period } = await params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const collectorId = searchParams.get("collectorId") || "";

  const conditions = [
    sql`to_char(${bills.billPeriod}, 'YYYY-MM') = ${period}`,
  ];

  if (status === "lunas" || status === "belum_bayar") {
    conditions.push(eq(bills.status, status));
  }

  if (session.user.role === "collector") {
    conditions.push(eq(customers.assignedCollectorId, session.user.id));
  } else if (collectorId) {
    conditions.push(eq(customers.assignedCollectorId, collectorId));
  }

  const whereClause = and(...conditions);

  const [data, summaryResult, settingsResult] = await Promise.all([
    db
      .select({
        customerName: customers.name,
        packageName: internetPackages.name,
        invoiceNumber: bills.invoiceNumber,
        amount: bills.amount,
        status: bills.status,
        paymentDate: payments.paymentDate,
        collectorName: users.name,
      })
      .from(bills)
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .innerJoin(internetPackages, eq(customers.packageId, internetPackages.id))
      .leftJoin(payments, eq(payments.billId, bills.id))
      .leftJoin(users, eq(payments.collectorId, users.id))
      .where(whereClause)
      .orderBy(customers.name),
    db
      .select({
        total: sql<number>`count(*)::int`,
        paid: sql<number>`count(*) filter (where ${bills.status} = 'lunas')::int`,
        unpaid: sql<number>`count(*) filter (where ${bills.status} = 'belum_bayar')::int`,
      })
      .from(bills)
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .where(and(
        sql`to_char(${bills.billPeriod}, 'YYYY-MM') = ${period}`,
        session.user.role === "collector"
          ? eq(customers.assignedCollectorId, session.user.id)
          : collectorId ? eq(customers.assignedCollectorId, collectorId) : undefined,
      )),
    db.select().from(appSettings).limit(1),
  ]);

  const settings = settingsResult[0];
  const summary = summaryResult[0] || { total: 0, paid: 0, unpaid: 0 };

  const pdfBuffer = await renderToBuffer(
    <RekapTagihanDetailDocument
      data={{
        appName: settings?.appName || "Bill BumdesNET",
        bumdesAddress: settings?.bumdesAddress || "",
        period,
        rows: data.map((row) => ({
          customerName: row.customerName,
          packageName: row.packageName,
          invoiceNumber: row.invoiceNumber,
          amount: row.amount,
          status: row.status,
          paymentDate: row.paymentDate,
          collectorName: row.collectorName,
        })),
        summary,
      }}
    />
  );

  const filename = `detail-tagihan-${period}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}

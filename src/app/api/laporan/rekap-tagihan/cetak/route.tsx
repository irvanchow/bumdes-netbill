import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bills, customers, appSettings } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { RekapTagihanDocument } from "@/lib/pdf-rekap-tagihan";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") || new Date().getFullYear().toString();
  const collectorId = searchParams.get("collectorId") || "";

  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const conditions = [
    gte(bills.billPeriod, startOfYear),
    lte(bills.billPeriod, endOfYear),
  ];

  if (session.user.role === "collector") {
    conditions.push(eq(customers.assignedCollectorId, session.user.id));
  } else if (collectorId) {
    conditions.push(eq(customers.assignedCollectorId, collectorId));
  }

  const whereClause = and(...conditions);

  const data = await db
    .select({
      period: sql<string>`to_char(${bills.billPeriod}, 'YYYY-MM')`,
      totalBills: sql<number>`count(*)::int`,
      paidBills: sql<number>`count(*) filter (where ${bills.status} = 'lunas')::int`,
      unpaidBills: sql<number>`count(*) filter (where ${bills.status} = 'belum_bayar')::int`,
      totalAmount: sql<number>`coalesce(sum(${bills.amount}), 0)::int`,
      paidAmount: sql<number>`coalesce(sum(case when ${bills.status} = 'lunas' then ${bills.amount} else 0 end), 0)::int`,
      unpaidAmount: sql<number>`coalesce(sum(case when ${bills.status} = 'belum_bayar' then ${bills.amount} else 0 end), 0)::int`,
    })
    .from(bills)
    .innerJoin(customers, eq(bills.customerId, customers.id))
    .where(whereClause)
    .groupBy(sql`to_char(${bills.billPeriod}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${bills.billPeriod}, 'YYYY-MM')`);

  const summary = data.reduce(
    (acc, row) => ({
      totalBills: acc.totalBills + row.totalBills,
      paidBills: acc.paidBills + row.paidBills,
      unpaidBills: acc.unpaidBills + row.unpaidBills,
      totalAmount: acc.totalAmount + row.totalAmount,
      paidAmount: acc.paidAmount + row.paidAmount,
      unpaidAmount: acc.unpaidAmount + row.unpaidAmount,
    }),
    { totalBills: 0, paidBills: 0, unpaidBills: 0, totalAmount: 0, paidAmount: 0, unpaidAmount: 0 }
  );

  const collectionRate = summary.totalBills > 0
    ? Math.round((summary.paidBills / summary.totalBills) * 10000) / 100
    : 0;

  const [settings] = await db.select().from(appSettings).limit(1);

  const pdfBuffer = await renderToBuffer(
    <RekapTagihanDocument
      data={{
        appName: settings?.appName || "Bill BumdesNET",
        bumdesAddress: settings?.bumdesAddress || "",
        year,
        rows: data,
        summary: { ...summary, collectionRate },
      }}
    />
  );

  const filename = `laporan-rekap-tagihan-${year}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}

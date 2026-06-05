import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payments, bills, customers, appSettings } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { ShareRevenueDocument } from "@/lib/pdf-share-revenue";

// Share percentages (mirrors route.ts)
const SHARE = {
  instalasi: { isp: 0.80, bumdesa: 0.20 },
  fiber_optik: { isp: 0.70, bumdesa: 0.30 },
  wireless_broadband: { isp: 0.45, bumdesa: 0.55 },
} as const;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const collectorId = searchParams.get("collectorId") || "";

  const conditions = [eq(bills.status, "lunas")];

  if (session.user.role === "collector") {
    conditions.push(eq(payments.collectorId, session.user.id));
  } else if (collectorId) {
    conditions.push(eq(payments.collectorId, collectorId));
  }

  if (startDate) conditions.push(gte(payments.paymentDate, startDate));
  if (endDate) conditions.push(lte(payments.paymentDate, endDate));

  const rows = await db
    .select({
      amount: payments.amountPaid,
      paymentDate: payments.paymentDate,
      billType: bills.billType,
      category: customers.category,
    })
    .from(payments)
    .innerJoin(bills, eq(payments.billId, bills.id))
    .innerJoin(customers, eq(bills.customerId, customers.id))
    .where(and(...conditions));

  // Group by month and compute share
  const monthlyMap = new Map<string, { instalasi: number; fiberOptik: number; wirelessBroadband: number; totalIsp: number; totalBumdesa: number }>();

  let grandTotal = 0;
  let grandIsp = 0;
  let grandBumdesa = 0;
  let sInstalasi = { total: 0, isp: 0, bumdesa: 0 };
  let sFiber = { total: 0, isp: 0, bumdesa: 0 };
  let sWireless = { total: 0, isp: 0, bumdesa: 0 };

  for (const row of rows) {
    const period = typeof row.paymentDate === "string" ? row.paymentDate.substring(0, 7) : "";
    if (!period) continue;

    if (!monthlyMap.has(period)) {
      monthlyMap.set(period, { instalasi: 0, fiberOptik: 0, wirelessBroadband: 0, totalIsp: 0, totalBumdesa: 0 });
    }
    const m = monthlyMap.get(period)!;

    let isp = 0;
    let bumdesa = 0;

    if (row.billType === "instalasi") {
      isp = Math.round(row.amount * SHARE.instalasi.isp);
      bumdesa = Math.round(row.amount * SHARE.instalasi.bumdesa);
      m.instalasi += row.amount;
      sInstalasi.total += row.amount;
      sInstalasi.isp += isp;
      sInstalasi.bumdesa += bumdesa;
    } else if (row.category === "fiber_optik") {
      isp = Math.round(row.amount * SHARE.fiber_optik.isp);
      bumdesa = Math.round(row.amount * SHARE.fiber_optik.bumdesa);
      m.fiberOptik += row.amount;
      sFiber.total += row.amount;
      sFiber.isp += isp;
      sFiber.bumdesa += bumdesa;
    } else if (row.category === "wireless_broadband") {
      isp = Math.round(row.amount * SHARE.wireless_broadband.isp);
      bumdesa = Math.round(row.amount * SHARE.wireless_broadband.bumdesa);
      m.wirelessBroadband += row.amount;
      sWireless.total += row.amount;
      sWireless.isp += isp;
      sWireless.bumdesa += bumdesa;
    }

    m.totalIsp += isp;
    m.totalBumdesa += bumdesa;
    grandIsp += isp;
    grandBumdesa += bumdesa;
  }
  grandTotal = grandIsp + grandBumdesa;

  const monthlyData = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, m]) => ({
      period,
      instalasi: { total: m.instalasi, isp: Math.round(m.instalasi * SHARE.instalasi.isp), bumdesa: Math.round(m.instalasi * SHARE.instalasi.bumdesa) },
      fiberOptik: { total: m.fiberOptik, isp: Math.round(m.fiberOptik * SHARE.fiber_optik.isp), bumdesa: Math.round(m.fiberOptik * SHARE.fiber_optik.bumdesa) },
      wirelessBroadband: { total: m.wirelessBroadband, isp: Math.round(m.wirelessBroadband * SHARE.wireless_broadband.isp), bumdesa: Math.round(m.wirelessBroadband * SHARE.wireless_broadband.bumdesa) },
      totalIsp: m.totalIsp,
      totalBumdesa: m.totalBumdesa,
    }));

  const [settings] = await db.select().from(appSettings).limit(1);

  const pdfBuffer = await renderToBuffer(
    <ShareRevenueDocument
      data={{
        appName: settings?.appName || "Bill BumdesNET",
        bumdesAddress: settings?.bumdesAddress || "",
        startDate: startDate || new Date().toISOString().split("T")[0],
        endDate: endDate || new Date().toISOString().split("T")[0],
        data: monthlyData,
        summary: {
          totalRevenue: grandTotal,
          totalIsp: grandIsp,
          totalBumdesa: grandBumdesa,
          instalasi: sInstalasi,
          fiberOptik: sFiber,
          wirelessBroadband: sWireless,
        },
      }}
    />
  );

  const filename = `laporan-share-revenue-${startDate || "all"}-${endDate || "all"}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}

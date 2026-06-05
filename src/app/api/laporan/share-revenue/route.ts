import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payments, bills, customers, users } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

// Share percentages
const SHARE = {
  instalasi: { isp: 0.80, bumdesa: 0.20 },
  fiber_optik: { isp: 0.70, bumdesa: 0.30 },
  wireless_broadband: { isp: 0.45, bumdesa: 0.55 },
} as const;

interface RevenueRow {
  period: string; // "YYYY-MM"
  amount: number;
  billType: "instalasi" | "bulanan";
  category: "wireless_broadband" | "fiber_optik" | null;
}

interface MonthlyBreakdown {
  total: number;
  isp: number;
  bumdesa: number;
}

interface MonthlyData {
  period: string;
  instalasi: MonthlyBreakdown;
  fiberOptik: MonthlyBreakdown;
  wirelessBroadband: MonthlyBreakdown;
  totalIsp: number;
  totalBumdesa: number;
}

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

  const whereClause = and(...conditions);

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
    .where(whereClause);

  // Group by month and compute share
  const monthlyMap = new Map<string, RevenueRow[]>();

  for (const row of rows) {
    // paymentDate is a string "YYYY-MM-DD", extract "YYYY-MM"
    const period = typeof row.paymentDate === "string"
      ? row.paymentDate.substring(0, 7)
      : "";
    if (!period) continue;

    if (!monthlyMap.has(period)) monthlyMap.set(period, []);
    monthlyMap.get(period)!.push({
      period,
      amount: row.amount,
      billType: row.billType as "instalasi" | "bulanan",
      category: row.category as "wireless_broadband" | "fiber_optik" | null,
    });
  }

  // Compute monthly data
  const data: MonthlyData[] = [];
  let grandTotal = 0;
  let grandIsp = 0;
  let grandBumdesa = 0;
  let summaryInstalasi = { total: 0, isp: 0, bumdesa: 0 };
  let summaryFiber = { total: 0, isp: 0, bumdesa: 0 };
  let summaryWireless = { total: 0, isp: 0, bumdesa: 0 };

  for (const [period, periodRows] of monthlyMap.entries()) {
    const m: MonthlyData = {
      period,
      instalasi: { total: 0, isp: 0, bumdesa: 0 },
      fiberOptik: { total: 0, isp: 0, bumdesa: 0 },
      wirelessBroadband: { total: 0, isp: 0, bumdesa: 0 },
      totalIsp: 0,
      totalBumdesa: 0,
    };

    for (const r of periodRows) {
      if (r.billType === "instalasi") {
        m.instalasi.total += r.amount;
        m.instalasi.isp += Math.round(r.amount * SHARE.instalasi.isp);
        m.instalasi.bumdesa += Math.round(r.amount * SHARE.instalasi.bumdesa);
      } else if (r.category === "fiber_optik") {
        m.fiberOptik.total += r.amount;
        m.fiberOptik.isp += Math.round(r.amount * SHARE.fiber_optik.isp);
        m.fiberOptik.bumdesa += Math.round(r.amount * SHARE.fiber_optik.bumdesa);
      } else if (r.category === "wireless_broadband") {
        m.wirelessBroadband.total += r.amount;
        m.wirelessBroadband.isp += Math.round(r.amount * SHARE.wireless_broadband.isp);
        m.wirelessBroadband.bumdesa += Math.round(r.amount * SHARE.wireless_broadband.bumdesa);
      }
      // If category is null (legacy data), skip categorization
    }

    m.totalIsp = m.instalasi.isp + m.fiberOptik.isp + m.wirelessBroadband.isp;
    m.totalBumdesa = m.instalasi.bumdesa + m.fiberOptik.bumdesa + m.wirelessBroadband.bumdesa;

    data.push(m);

    grandTotal += m.totalIsp + m.totalBumdesa;
    grandIsp += m.totalIsp;
    grandBumdesa += m.totalBumdesa;
    summaryInstalasi.total += m.instalasi.total;
    summaryInstalasi.isp += m.instalasi.isp;
    summaryInstalasi.bumdesa += m.instalasi.bumdesa;
    summaryFiber.total += m.fiberOptik.total;
    summaryFiber.isp += m.fiberOptik.isp;
    summaryFiber.bumdesa += m.fiberOptik.bumdesa;
    summaryWireless.total += m.wirelessBroadband.total;
    summaryWireless.isp += m.wirelessBroadband.isp;
    summaryWireless.bumdesa += m.wirelessBroadband.bumdesa;
  }

  // Sort by period ascending
  data.sort((a, b) => a.period.localeCompare(b.period));

  return NextResponse.json({
    data,
    summary: {
      totalRevenue: grandTotal,
      totalIsp: grandIsp,
      totalBumdesa: grandBumdesa,
      instalasi: summaryInstalasi,
      fiberOptik: summaryFiber,
      wirelessBroadband: summaryWireless,
    },
  });
}

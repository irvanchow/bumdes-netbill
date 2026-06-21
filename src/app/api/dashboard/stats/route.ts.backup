import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bills, customers, payments } from "@/lib/db/schema";
import { eq, sql, and, gte, lte } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const isCollector = session.user.role === "collector";

  const [totalCustomers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(
      isCollector
        ? and(eq(customers.status, "aktif"), eq(customers.assignedCollectorId, session.user.id))
        : eq(customers.status, "aktif")
    );

  const [totalBillsThisMonth] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(amount), 0)::int`,
    })
    .from(bills)
    .innerJoin(customers, eq(bills.customerId, customers.id))
    .where(
      isCollector
        ? and(eq(bills.billPeriod, currentMonthStart), eq(customers.assignedCollectorId, session.user.id))
        : eq(bills.billPeriod, currentMonthStart)
    );

  const [paidThisMonth] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(amount), 0)::int`,
    })
    .from(bills)
    .innerJoin(customers, eq(bills.customerId, customers.id))
    .where(
      isCollector
        ? and(
            eq(bills.billPeriod, currentMonthStart),
            eq(bills.status, "lunas"),
            eq(customers.assignedCollectorId, session.user.id)
          )
        : and(eq(bills.billPeriod, currentMonthStart), eq(bills.status, "lunas"))
    );

  const [unpaidThisMonth] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(amount), 0)::int`,
    })
    .from(bills)
    .innerJoin(customers, eq(bills.customerId, customers.id))
    .where(
      isCollector
        ? and(
            eq(bills.billPeriod, currentMonthStart),
            eq(bills.status, "belum_bayar"),
            eq(customers.assignedCollectorId, session.user.id)
          )
        : and(eq(bills.billPeriod, currentMonthStart), eq(bills.status, "belum_bayar"))
    );

  // Monthly revenue for last 12 months
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split("T")[0];
  const revenueByMonth = await db
    .select({
      period: bills.billPeriod,
      total: sql<number>`coalesce(sum(${bills.amount}), 0)::int`,
    })
    .from(bills)
    .innerJoin(customers, eq(bills.customerId, customers.id))
    .where(
      isCollector
        ? and(
            eq(bills.status, "lunas"),
            gte(bills.billPeriod, twelveMonthsAgo),
            eq(customers.assignedCollectorId, session.user.id)
          )
        : and(eq(bills.status, "lunas"), gte(bills.billPeriod, twelveMonthsAgo))
    )
    .groupBy(bills.billPeriod)
    .orderBy(bills.billPeriod);

  return NextResponse.json({
    data: {
      totalCustomers: totalCustomers.count,
      billsThisMonth: {
        count: totalBillsThisMonth.count,
        total: totalBillsThisMonth.total,
      },
      paidThisMonth: {
        count: paidThisMonth.count,
        total: paidThisMonth.total,
      },
      unpaidThisMonth: {
        count: unpaidThisMonth.count,
        total: unpaidThisMonth.total,
      },
      revenueByMonth,
    },
  });
}

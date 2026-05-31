import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bills, customers, internetPackages, payments, users } from "@/lib/db/schema";
import { eq, and, like, sql, ilike } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ period: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { period } = await params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const collectorId = searchParams.get("collectorId") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const conditions = [
    sql`to_char(${bills.billPeriod}, 'YYYY-MM') = ${period}`,
  ];

  if (status === "lunas" || status === "belum_bayar") {
    conditions.push(eq(bills.status, status));
  }

  if (search) {
    conditions.push(ilike(customers.name, `%${search}%`));
  }

  if (session.user.role === "collector") {
    conditions.push(eq(customers.assignedCollectorId, session.user.id));
  } else if (collectorId) {
    conditions.push(eq(customers.assignedCollectorId, collectorId));
  }

  const whereClause = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: bills.id,
        customerName: customers.name,
        customerPhone: customers.phone,
        packageName: internetPackages.name,
        invoiceNumber: bills.invoiceNumber,
        amount: bills.amount,
        status: bills.status,
        dueDate: bills.dueDate,
        paymentDate: payments.paymentDate,
        collectorName: users.name,
      })
      .from(bills)
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .innerJoin(internetPackages, eq(customers.packageId, internetPackages.id))
      .leftJoin(payments, eq(payments.billId, bills.id))
      .leftJoin(users, eq(payments.collectorId, users.id))
      .where(whereClause)
      .orderBy(customers.name)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(bills)
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .innerJoin(internetPackages, eq(customers.packageId, internetPackages.id))
      .leftJoin(payments, eq(payments.billId, bills.id))
      .leftJoin(users, eq(payments.collectorId, users.id))
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  const [summaryResult] = await db
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
    ));

  return NextResponse.json({
    data,
    summary: summaryResult || { total: 0, paid: 0, unpaid: 0 },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

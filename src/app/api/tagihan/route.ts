import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bills, customers, internetPackages } from "@/lib/db/schema";
import { eq, and, desc, sql, ilike } from "drizzle-orm";
import { generateMonthlyBills } from "@/lib/billing";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const status = searchParams.get("status") || "";
  const period = searchParams.get("period") || "";
  const search = searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  const conditions = [];

  if (session.user.role === "collector") {
    conditions.push(eq(customers.assignedCollectorId, session.user.id));
  }

  if (status === "belum_bayar" || status === "lunas") {
    conditions.push(eq(bills.status, status));
  }

  if (period) {
    conditions.push(eq(bills.billPeriod, period));
  }

  if (search) {
    conditions.push(ilike(customers.name, `%${search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: bills.id,
        customerId: bills.customerId,
        customerName: customers.name,
        customerAddress: customers.address,
        customerPhone: customers.phone,
        packageName: internetPackages.name,
        billPeriod: bills.billPeriod,
        billType: bills.billType,
        amount: bills.amount,
        status: bills.status,
        dueDate: bills.dueDate,
        invoiceNumber: bills.invoiceNumber,
        createdAt: bills.createdAt,
      })
      .from(bills)
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .leftJoin(internetPackages, eq(customers.packageId, internetPackages.id))
      .where(whereClause)
      .orderBy(desc(bills.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(bills)
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  return NextResponse.json({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const period = body.period ? new Date(body.period) : new Date();

  const result = await generateMonthlyBills(period);

  return NextResponse.json({
    message: "Tagihan berhasil digenerate",
    ...result,
  });
}

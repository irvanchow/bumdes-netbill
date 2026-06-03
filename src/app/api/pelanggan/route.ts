import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers, internetPackages, users } from "@/lib/db/schema";
import { eq, ilike, and, or, sql, desc } from "drizzle-orm";
import { pelangganSchema } from "@/lib/validators";
import { generateInstallationBill } from "@/lib/billing";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const offset = (page - 1) * limit;

  const conditions = [];

  if (session.user.role === "collector") {
    conditions.push(eq(customers.assignedCollectorId, session.user.id));
  }

  if (search) {
    conditions.push(
      or(
        ilike(customers.name, `%${search}%`),
        ilike(customers.phone, `%${search}%`),
        ilike(customers.address, `%${search}%`)
      )!
    );
  }

  if (status === "aktif" || status === "nonaktif" || status === "suspend" || status === "belum_aktif") {
    conditions.push(eq(customers.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: customers.id,
        name: customers.name,
        address: customers.address,
        phone: customers.phone,
        email: customers.email,
        status: customers.status,
        registrationDate: customers.registrationDate,
        activationDate: customers.activationDate,
        category: customers.category,
        packageName: internetPackages.name,
        packageSpeed: internetPackages.speed,
        monthlyPrice: internetPackages.monthlyPrice,
        collectorName: users.name,
      })
      .from(customers)
      .leftJoin(internetPackages, eq(customers.packageId, internetPackages.id))
      .leftJoin(users, eq(customers.assignedCollectorId, users.id))
      .where(whereClause)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = pelangganSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const [newCustomer] = await db
      .insert(customers)
      .values({
        name: parsed.data.name,
        address: parsed.data.address,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        packageId: parsed.data.packageId,
        category: parsed.data.category,
        registrationDate: parsed.data.registrationDate,
        activationDate: parsed.data.activationDate || null,
        latitude: parsed.data.latitude ? String(parsed.data.latitude) : null,
        longitude: parsed.data.longitude ? String(parsed.data.longitude) : null,
        assignedCollectorId: parsed.data.assignedCollectorId || null,
        status: "belum_aktif",
      })
      .returning();

    // Generate installation bill for new customer
    await generateInstallationBill(newCustomer.id);

    return NextResponse.json({ data: newCustomer }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menambahkan pelanggan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

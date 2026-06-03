import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers, internetPackages, users, bills, payments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { pelangganSchema } from "@/lib/validators";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [customer] = await db
    .select({
      id: customers.id,
      name: customers.name,
      address: customers.address,
      phone: customers.phone,
      email: customers.email,
      status: customers.status,
      registrationDate: customers.registrationDate,
      activationDate: customers.activationDate,
      latitude: customers.latitude,
      longitude: customers.longitude,
      packageId: customers.packageId,
      category: customers.category,
      assignedCollectorId: customers.assignedCollectorId,
      packageName: internetPackages.name,
      packageSpeed: internetPackages.speed,
      monthlyPrice: internetPackages.monthlyPrice,
      collectorName: users.name,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .leftJoin(internetPackages, eq(customers.packageId, internetPackages.id))
    .leftJoin(users, eq(customers.assignedCollectorId, users.id))
    .where(eq(customers.id, id))
    .limit(1);

  if (!customer) return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });

  if (session.user.role === "collector" && customer.assignedCollectorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get payment history for this customer
  const paymentHistory = await db
    .select({
      id: payments.id,
      transactionCode: payments.transactionCode,
      amountPaid: payments.amountPaid,
      paymentDate: payments.paymentDate,
      paymentTime: payments.paymentTime,
      paymentMethod: payments.paymentMethod,
      invoiceNumber: bills.invoiceNumber,
      billPeriod: bills.billPeriod,
      collectorName: users.name,
    })
    .from(payments)
    .innerJoin(bills, eq(payments.billId, bills.id))
    .leftJoin(users, eq(payments.collectorId, users.id))
    .where(eq(bills.customerId, id))
    .orderBy(desc(payments.paymentDate));

  return NextResponse.json({ data: { ...customer, paymentHistory } });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const parsed = pelangganSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [updated] = await db
    .update(customers)
    .set({
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
      updatedAt: new Date(),
    })
    .where(eq(customers.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [updated] = await db
    .update(customers)
    .set({ status: "nonaktif", updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ data: updated });
}

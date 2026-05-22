import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payments, bills } from "@/lib/db/schema";
import { eq, desc, sql, and, like } from "drizzle-orm";
import { pembayaranSchema } from "@/lib/validators";
import { users, customers } from "@/lib/db/schema";
import { updateCustomerStatusAfterPayment } from "@/lib/billing";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  const conditions = [];

  if (session.user.role === "collector") {
    conditions.push(eq(payments.collectorId, session.user.id));
  }

  const whereClause = conditions.length > 0 ? conditions[0] : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: payments.id,
        transactionCode: payments.transactionCode,
        amountPaid: payments.amountPaid,
        paymentDate: payments.paymentDate,
        paymentMethod: payments.paymentMethod,
        notes: payments.notes,
        collectorName: users.name,
        invoiceNumber: bills.invoiceNumber,
        customerName: customers.name,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .innerJoin(bills, eq(payments.billId, bills.id))
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .leftJoin(users, eq(payments.collectorId, users.id))
      .where(whereClause)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(payments)
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

  const body = await request.json();
  const parsed = pembayaranSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [bill] = await db
    .select()
    .from(bills)
    .where(eq(bills.id, parsed.data.billId))
    .limit(1);

  if (!bill) return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
  if (bill.status === "lunas") return NextResponse.json({ error: "Tagihan sudah lunas" }, { status: 400 });

  // For installation bills, check if activationDate is set
  if (bill.billType === "instalasi") {
    const [customer] = await db
      .select({ activationDate: customers.activationDate })
      .from(customers)
      .where(eq(customers.id, bill.customerId))
      .limit(1);

    if (!customer?.activationDate) {
      return NextResponse.json({ error: "Tanggal aktivasi belum diset. Edit data pelanggan terlebih dahulu." }, { status: 400 });
    }
  }

  // Jumlah bayar harus sama dengan tagihan
  if (parsed.data.amountPaid !== bill.amount) {
    return NextResponse.json({ error: "Jumlah bayar harus sama dengan jumlah tagihan" }, { status: 400 });
  }

  // Generate transaction code: TRX-YYYYMMDD-XXXX
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = today.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const prefix = `TRX-${dateStr}-`;

  const [lastTrx] = await db
    .select({ transactionCode: payments.transactionCode })
    .from(payments)
    .where(like(payments.transactionCode, `${prefix}%`))
    .orderBy(desc(payments.transactionCode))
    .limit(1);

  let nextNum = 1;
  if (lastTrx) {
    const lastNum = parseInt(lastTrx.transactionCode.split("-").pop() || "0");
    nextNum = lastNum + 1;
  }
  const transactionCode = `${prefix}${String(nextNum).padStart(4, "0")}`;

  const [payment] = await db
    .insert(payments)
    .values({
      transactionCode,
      billId: parsed.data.billId,
      amountPaid: parsed.data.amountPaid,
      paymentDate: parsed.data.paymentDate,
      paymentTime: timeStr,
      paymentMethod: parsed.data.paymentMethod,
      collectorId: session.user.id,
      proofImageUrl: parsed.data.proofImageUrl || null,
      notes: parsed.data.notes || null,
    })
    .returning();

  await db
    .update(bills)
    .set({ status: "lunas", updatedAt: new Date() })
    .where(eq(bills.id, parsed.data.billId));

  // Update customer status based on remaining unpaid bills
  await updateCustomerStatusAfterPayment(bill.customerId, parsed.data.billId);

  return NextResponse.json({ data: payment, transactionCode, paymentTime: timeStr }, { status: 201 });
}

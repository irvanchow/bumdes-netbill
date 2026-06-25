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
        customerId: customers.id,
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

  // ── Multi-bill path ──────────────────────────────────────────────────────
  if (Array.isArray(body.billIds) && body.billIds.length > 1) {
    const { billIds, paymentDate, paymentMethod, proofImageUrl, notes } = body;

    if (!paymentDate || !paymentMethod) {
      return NextResponse.json({ error: "Tanggal dan metode bayar wajib diisi" }, { status: 400 });
    }

    // Ambil semua tagihan sekaligus
    const billList = await db
      .select({ id: bills.id, customerId: bills.customerId, amount: bills.amount, status: bills.status, billType: bills.billType, billPeriod: bills.billPeriod, invoiceNumber: bills.invoiceNumber })
      .from(bills)
      .where(sql`${bills.id} = ANY(${billIds})`);

    if (billList.length !== billIds.length) {
      return NextResponse.json({ error: "Satu atau lebih tagihan tidak ditemukan" }, { status: 404 });
    }
    if (billList.some((b) => b.status === "lunas")) {
      return NextResponse.json({ error: "Satu atau lebih tagihan sudah lunas" }, { status: 400 });
    }
    const uniqueCustomers = new Set(billList.map((b) => b.customerId));
    if (uniqueCustomers.size > 1) {
      return NextResponse.json({ error: "Semua tagihan harus milik pelanggan yang sama" }, { status: 400 });
    }

    const totalAmount = billList.reduce((s, b) => s + b.amount, 0);

    // Generate base transaction code
    const today = new Date();
    const witaDate = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Makassar" }));
    const dateStr = witaDate.getFullYear().toString() +
      String(witaDate.getMonth() + 1).padStart(2, "0") +
      String(witaDate.getDate()).padStart(2, "0");
    const timeStr = String(witaDate.getHours()).padStart(2, "0") + ":" +
      String(witaDate.getMinutes()).padStart(2, "0") + ":" +
      String(witaDate.getSeconds()).padStart(2, "0");
    const prefix = `TRX-${dateStr}-`;

    const [lastTrx] = await db
      .select({ transactionCode: payments.transactionCode })
      .from(payments)
      .where(like(payments.transactionCode, `${prefix}%`))
      .orderBy(desc(payments.transactionCode))
      .limit(1);

    // Ambil nomor tertinggi dari hari ini (termasuk suffix -N)
    const lastNumRaw = lastTrx ? lastTrx.transactionCode.replace(prefix, "").split("-")[0] : "0";
    const baseNum = parseInt(lastNumRaw) + 1;
    const baseCode = `${prefix}${String(baseNum).padStart(4, "0")}`;

    // Insert satu payment per tagihan dengan suffix -1, -2, dst.
    const createdPayments = [];
    for (let i = 0; i < billList.length; i++) {
      const bill = billList[i];
      const trxCode = `${baseCode}-${i + 1}`;
      await db.insert(payments).values({
        transactionCode: trxCode,
        billId: bill.id,
        amountPaid: bill.amount,
        paymentDate,
        paymentTime: timeStr,
        paymentMethod,
        collectorId: session.user.id,
        proofImageUrl: proofImageUrl || null,
        notes: notes || null,
      });
      await db.update(bills).set({ status: "lunas", updatedAt: new Date() }).where(eq(bills.id, bill.id));
      createdPayments.push({ transactionCode: trxCode, billId: bill.id, invoiceNumber: bill.invoiceNumber, billPeriod: bill.billPeriod, amount: bill.amount });
    }

    // Update customer status (cukup panggil sekali untuk instalasi)
    const installationBill = billList.find((b) => b.billType === "instalasi");
    if (installationBill) {
      await updateCustomerStatusAfterPayment(installationBill.customerId, installationBill.id);
    }

    return NextResponse.json({
      multi: true,
      transactionCode: baseCode,
      paymentTime: timeStr,
      totalAmount,
      payments: createdPayments,
    }, { status: 201 });
  }

  // ── Single-bill path (backward-compatible) ───────────────────────────────
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
  const witaDate = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Makassar" }));
  const dateStr = witaDate.getFullYear().toString() +
    String(witaDate.getMonth() + 1).padStart(2, "0") +
    String(witaDate.getDate()).padStart(2, "0");
  const timeStr = String(witaDate.getHours()).padStart(2, "0") + ":" +
    String(witaDate.getMinutes()).padStart(2, "0") + ":" +
    String(witaDate.getSeconds()).padStart(2, "0");
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

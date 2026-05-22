import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bills, customers, internetPackages, payments, users } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [bill] = await db
    .select({
      id: bills.id,
      customerId: bills.customerId,
      customerName: customers.name,
      customerAddress: customers.address,
      customerPhone: customers.phone,
      customerEmail: customers.email,
      activationDate: customers.activationDate,
      packageName: internetPackages.name,
      packageSpeed: internetPackages.speed,
      billPeriod: bills.billPeriod,
      amount: bills.amount,
      status: bills.status,
      billType: bills.billType,
      dueDate: bills.dueDate,
      invoiceNumber: bills.invoiceNumber,
      createdAt: bills.createdAt,
    })
    .from(bills)
    .innerJoin(customers, eq(bills.customerId, customers.id))
    .leftJoin(internetPackages, eq(customers.packageId, internetPackages.id))
    .where(eq(bills.id, id))
    .limit(1);

  if (!bill) return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });

  if (session.user.role === "collector") {
    const [customer] = await db
      .select({ assignedCollectorId: customers.assignedCollectorId })
      .from(customers)
      .where(eq(customers.id, bill.customerId))
      .limit(1);
    if (customer?.assignedCollectorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const paymentData = await db
    .select({
      id: payments.id,
      transactionCode: payments.transactionCode,
      amountPaid: payments.amountPaid,
      paymentDate: payments.paymentDate,
      paymentTime: payments.paymentTime,
      paymentMethod: payments.paymentMethod,
      collectorName: users.name,
      notes: payments.notes,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .leftJoin(users, eq(payments.collectorId, users.id))
    .where(eq(payments.billId, id));

  // Get other unpaid bills for the same customer
  const otherUnpaidBills = await db
    .select({
      id: bills.id,
      billPeriod: bills.billPeriod,
      amount: bills.amount,
      dueDate: bills.dueDate,
      invoiceNumber: bills.invoiceNumber,
    })
    .from(bills)
    .where(
      and(
        eq(bills.customerId, bill.customerId),
        eq(bills.status, "belum_bayar"),
        ne(bills.id, id)
      )
    );

  return NextResponse.json({
    data: {
      ...bill,
      payments: paymentData,
      otherUnpaidBills,
    },
  });
}

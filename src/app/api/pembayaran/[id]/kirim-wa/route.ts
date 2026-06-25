import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments, bills, customers, internetPackages, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendFonnteMessage, normalizePhone } from "@/lib/fonnte";
import { buildPaymentReceiptText } from "@/lib/wa-templates";

/**
 * POST /api/pembayaran/[id]/kirim-wa
 * Kirim ulang bukti pembayaran ke WhatsApp pelanggan via Fonnte.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Ambil data lengkap: pembayaran + bill + pelanggan + paket + collector
    const [row] = await db
      .select({
        transactionCode: payments.transactionCode,
        amountPaid: payments.amountPaid,
        paymentDate: payments.paymentDate,
        paymentTime: payments.paymentTime,
        paymentMethod: payments.paymentMethod,
        notes: payments.notes,
        invoiceNumber: bills.invoiceNumber,
        billPeriod: bills.billPeriod,
        billType: bills.billType,
        customerName: customers.name,
        customerAddress: customers.address,
        customerPhone: customers.phone,
        packageName: internetPackages.name,
        collectorName: users.name,
      })
      .from(payments)
      .innerJoin(bills, eq(payments.billId, bills.id))
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .innerJoin(internetPackages, eq(customers.packageId, internetPackages.id))
      .innerJoin(users, eq(payments.collectorId, users.id))
      .where(eq(payments.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });
    }

    if (!row.customerPhone) {
      return NextResponse.json({ error: "Pelanggan tidak memiliki nomor HP" }, { status: 400 });
    }

    const message = buildPaymentReceiptText({
      customerName: row.customerName,
      customerAddress: row.customerAddress,
      packageName: row.packageName,
      transactionCode: row.transactionCode,
      invoiceNumber: row.invoiceNumber,
      billPeriod: row.billPeriod,
      billType: row.billType,
      amountPaid: row.amountPaid,
      paymentDate: row.paymentDate,
      paymentTime: row.paymentTime,
      paymentMethod: row.paymentMethod,
      collectorName: row.collectorName,
    });

    const result = await sendFonnteMessage(row.customerPhone, message);

    if (!result.ok) {
      return NextResponse.json(
        { error: "Gagal mengirim pesan via Fonnte", detail: result.detail },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Pesan terkirim ke ${normalizePhone(row.customerPhone)}`,
    });
  } catch (error) {
    console.error("Error sending payment receipt:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengirim pesan" },
      { status: 500 }
    );
  }
}

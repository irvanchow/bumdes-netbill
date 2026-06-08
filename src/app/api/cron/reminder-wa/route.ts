import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bills, customers, internetPackages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { toLocalDateStr } from "@/lib/utils";
import { buildReminderText } from "@/lib/wa-templates";
import { sendFonnteMessage } from "@/lib/fonnte";

/**
 * Hitung tanggal H+3 di timezone WITA (UTC+8) sebagai string YYYY-MM-DD.
 * Penting: jangan pakai toISOString() karena akan menggeser tanggal di server UTC.
 */
function targetDueDateWITA(): string {
  const now = new Date();
  // Konversi ke WITA dengan menambah offset (UTC+8) lalu pakai komponen UTC.
  const witaNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const target = new Date(
    Date.UTC(witaNow.getUTCFullYear(), witaNow.getUTCMonth(), witaNow.getUTCDate() + 3)
  );
  const year = target.getUTCFullYear();
  const month = String(target.getUTCMonth() + 1).padStart(2, "0");
  const day = String(target.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const targetDate = targetDueDateWITA();

  const rows = await db
    .select({
      billId: bills.id,
      invoiceNumber: bills.invoiceNumber,
      amount: bills.amount,
      dueDate: bills.dueDate,
      customerName: customers.name,
      customerPhone: customers.phone,
      packageName: internetPackages.name,
    })
    .from(bills)
    .innerJoin(customers, eq(bills.customerId, customers.id))
    .innerJoin(internetPackages, eq(customers.packageId, internetPackages.id))
    .where(
      and(
        eq(bills.status, "belum_bayar"),
        eq(bills.billType, "bulanan"),
        eq(bills.dueDate, targetDate)
      )
    );

  const targets = rows.filter((r) => r.customerPhone && r.customerPhone.trim().length > 0);
  const skipped = rows.length - targets.length;

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      targetDate,
      total: rows.length,
      willSend: targets.length,
      skipped,
      preview: targets.map((t) => ({
        invoiceNumber: t.invoiceNumber,
        customerName: t.customerName,
        customerPhone: t.customerPhone,
        message: buildReminderText({
          customerName: t.customerName,
          invoiceNumber: t.invoiceNumber,
          packageName: t.packageName,
          dueDate: t.dueDate,
          amount: t.amount,
        }),
      })),
    });
  }

  const details: Array<{
    invoiceNumber: string;
    customerName: string;
    phone: string;
    ok: boolean;
    status: number;
    error?: unknown;
  }> = [];
  let sent = 0;
  let failed = 0;

  for (const t of targets) {
    const message = buildReminderText({
      customerName: t.customerName,
      invoiceNumber: t.invoiceNumber,
      packageName: t.packageName,
      dueDate: t.dueDate,
      amount: t.amount,
    });

    const result = await sendFonnteMessage(t.customerPhone, message);

    if (result.ok) {
      sent++;
    } else {
      failed++;
    }

    details.push({
      invoiceNumber: t.invoiceNumber,
      customerName: t.customerName,
      phone: t.customerPhone,
      ok: result.ok,
      status: result.status,
      error: result.ok ? undefined : result.detail,
    });
  }

  return NextResponse.json({
    message: "Pengingat tagihan berhasil diproses",
    targetDate,
    total: rows.length,
    sent,
    failed,
    skipped,
    details,
  });
}

import { formatDate, formatRupiah } from "@/lib/utils";

export type ReminderInput = {
  customerName: string;
  invoiceNumber: string;
  packageName: string;
  dueDate: string | Date;
  amount: number;
};

/**
 * Template pesan pengingat tagihan bulanan untuk dikirim H-3 jatuh tempo.
 * Format mengikuti template WA manual di halaman tagihan.
 */
export function buildReminderText(input: ReminderInput): string {
  return [
    "Kami dari Bumdesa GIRI MANDALA ingin menginformasikan tagihan internet Bapak/Ibu :",
    "",
    `Nama: ${input.customerName}`,
    `No. Invoice: ${input.invoiceNumber}`,
    `Paket: ${input.packageName}`,
    `Jatuh Tempo: ${formatDate(input.dueDate)}`,
    `Jumlah: ${formatRupiah(input.amount)}`,
    "",
    "Mohon untuk dapat melakukan pembayaran melalui collector kami. Terima kasih.",
    "",
    "Bumdesa GIRI MANDALA",
  ].join("\n");
}

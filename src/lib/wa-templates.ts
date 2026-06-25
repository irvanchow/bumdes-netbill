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

/**
 * Template pesan bukti pembayaran untuk dikirim ulang via Fonnte.
 */
export type PaymentReceiptInput = {
  customerName: string;
  customerAddress: string;
  packageName: string;
  transactionCode: string;
  invoiceNumber: string;
  billPeriod: string;
  billType: string;
  amountPaid: number;
  paymentDate: string;
  paymentTime: string | null;
  paymentMethod: string;
  collectorName: string;
};

export function buildPaymentReceiptText(input: PaymentReceiptInput): string {
  const paidAt = input.paymentTime
    ? `${formatDate(input.paymentDate)} ${input.paymentTime}`
    : formatDate(input.paymentDate);

  return [
    "================================",
    "*Bukti Pembayaran BumdesNET*",
    'BumDesa "GIRI MANDALA"',
    "================================",
    `Kode Trx    : ${input.transactionCode}`,
    `Invoice     : ${input.invoiceNumber}`,
    `Tanggal     : ${paidAt}`,
    "--------------------------------",
    `Pelanggan   : ${input.customerName}`,
    `Alamat      : ${input.customerAddress}`,
    `Paket       : ${input.packageName}`,
    `Periode     : ${formatDate(input.billPeriod)}`,
    `Jenis       : ${input.billType === "instalasi" ? "Instalasi" : "Bulanan"}`,
    "--------------------------------",
    `Jumlah      : *${formatRupiah(input.amountPaid)}*`,
    `Metode      : ${input.paymentMethod === "transfer" ? "Transfer" : "Tunai"}`,
    "--------------------------------",
    `Collector   : ${input.collectorName}`,
    "================================",
    "Terima kasih atas pembayaran Anda.",
    "Simpan struk ini sebagai bukti pembayaran yang sah.",
    "================================",
  ].join("\n");
}

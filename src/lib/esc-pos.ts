// ESC/POS command builder for thermal printers (58mm/80mm)

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// Text alignment
const ALIGN_LEFT = new Uint8Array([ESC, 0x61, 0x00]);
const ALIGN_CENTER = new Uint8Array([ESC, 0x61, 0x01]);
const ALIGN_RIGHT = new Uint8Array([ESC, 0x61, 0x02]);

// Text style
const BOLD_ON = new Uint8Array([ESC, 0x45, 0x01]);
const BOLD_OFF = new Uint8Array([ESC, 0x45, 0x00]);
const DOUBLE_HEIGHT_ON = new Uint8Array([ESC, 0x21, 0x10]);
const DOUBLE_WIDTH_ON = new Uint8Array([ESC, 0x21, 0x20]);
const DOUBLE_SIZE_ON = new Uint8Array([ESC, 0x21, 0x30]);
const NORMAL_SIZE = new Uint8Array([ESC, 0x21, 0x00]);

// Commands
const INIT = new Uint8Array([ESC, 0x40]);
const CUT = new Uint8Array([GS, 0x56, 0x00]);
const FEED_LINE = new Uint8Array([LF]);

function textToBytes(text: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(text);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function line(text: string): Uint8Array {
  return concat(textToBytes(text), FEED_LINE);
}

function separator(char = "-", width = 32): Uint8Array {
  return line(char.repeat(width));
}

function doubleSeparator(char = "=", width = 32): Uint8Array {
  return line(char.repeat(width));
}

function padRight(label: string, value: string, width = 32): string {
  const space = width - label.length - value.length;
  return label + " ".repeat(Math.max(1, space)) + value;
}

export interface ReceiptData {
  appName: string;
  address: string;
  transactionCode: string;
  invoiceNumber: string;
  paymentDate: string;
  paymentTime: string;
  billType?: string;
  customerName: string;
  customerAddress: string;
  packageName: string;
  period: string;
  amount: number;
  paymentMethod: string;
  collectorName: string;
}

function formatRupiahPlain(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

/** Bangun teks struk untuk dikirim via WhatsApp. Isinya sama dengan struk cetak. */
export function buildReceiptText(data: ReceiptData): string {
  const sep = "--------------------------------";
  const dSep = "================================";
  const keterangan = data.billType === "instalasi" ? "Biaya Instalasi" : "Biaya Internet";
  const metode = data.paymentMethod === "tunai" ? "Tunai" : "Transfer";
  const jumlah = formatRupiahPlain(data.amount);

  return [
    dSep,
    `*${data.appName}*`,
    data.address,
    dSep,
    `Kode Trx    : ${data.transactionCode}`,
    `No. Invoice : ${data.invoiceNumber}`,
    `Tanggal     : ${data.paymentDate} ${data.paymentTime}`,
    sep,
    `Pelanggan   : ${data.customerName}`,
    `Alamat      : ${data.customerAddress}`,
    `Paket       : ${data.packageName}`,
    `Periode     : ${data.period}`,
    sep,
    `Tagihan     : ${jumlah}`,
    `Dibayar     : ${jumlah}`,
    `Metode      : ${metode}`,
    `Keterangan  : ${keterangan}`,
    sep,
    `Collector   : ${data.collectorName}`,
    dSep,
    "Terima kasih atas pembayaran Anda.",
    dSep,
  ].join("\n");
}

export function buildReceipt(data: ReceiptData): Uint8Array {
  const parts: Uint8Array[] = [];

  // Initialize printer
  parts.push(INIT);

  // Header
  parts.push(ALIGN_CENTER);
  parts.push(doubleSeparator());
  parts.push(BOLD_ON);
  parts.push(DOUBLE_HEIGHT_ON);
  parts.push(line(data.appName));
  parts.push(NORMAL_SIZE);
  parts.push(BOLD_OFF);
  parts.push(line(data.address));
  parts.push(doubleSeparator());

  // Invoice info
  parts.push(ALIGN_LEFT);
  parts.push(line(`Kode Trx    : ${data.transactionCode}`));
  parts.push(line(`No. Invoice : ${data.invoiceNumber}`));
  parts.push(line(`Tanggal     : ${data.paymentDate} ${data.paymentTime}`));
  parts.push(separator());

  // Customer info
  parts.push(line(`Pelanggan   : ${data.customerName}`));
  parts.push(line(`Alamat      : ${data.customerAddress}`));
  parts.push(line(`Paket       : ${data.packageName}`));
  parts.push(line(`Periode     : ${data.period}`));
  parts.push(separator());

  // Payment info
  parts.push(line(padRight("Tagihan     :", formatRupiahPlain(data.amount))));
  parts.push(line(padRight("Dibayar     :", formatRupiahPlain(data.amount))));
  parts.push(line(`Metode      : ${data.paymentMethod === "tunai" ? "Tunai" : "Transfer"}`));
  parts.push(line(`Keterangan  : ${data.billType === "instalasi" ? "Biaya Instalasi" : "Biaya Internet"}`));
  parts.push(separator());

  // Collector
  parts.push(line(`Collector   : ${data.collectorName}`));
  parts.push(doubleSeparator());

  // Footer
  parts.push(ALIGN_CENTER);
  parts.push(line("Terima kasih atas"));
  parts.push(line("pembayaran Anda."));
  parts.push(doubleSeparator());

  // Feed and cut
  parts.push(FEED_LINE);
  parts.push(FEED_LINE);
  parts.push(FEED_LINE);
  parts.push(CUT);

  return concat(...parts);
}

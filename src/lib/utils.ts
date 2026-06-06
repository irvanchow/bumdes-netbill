import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date, time?: string | null): string {
  const formatted = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
  if (time) {
    return `${formatted} ${time}`;
  }
  return formatted;
}

export function formatShortDate(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

// Format a Date as YYYY-MM-DD using its LOCAL components, not UTC.
// Using toISOString() here would shift the calendar date on servers with a
// positive UTC offset (e.g. WITA, UTC+8), turning local midnight into the
// previous day's date.
export function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Prefix nomor invoice tagihan bulanan untuk suatu bulan, mis. "INV-202606-". */
export function invoicePrefix(period: Date): string {
  const year = period.getFullYear();
  const month = String(period.getMonth() + 1).padStart(2, "0");
  return `INV-${year}${month}-`;
}

/** Prefix nomor invoice instalasi untuk suatu bulan, mis. "INV-N202606-". */
export function installationInvoicePrefix(period: Date): string {
  const year = period.getFullYear();
  const month = String(period.getMonth() + 1).padStart(2, "0");
  return `INV-N${year}${month}-`;
}

export function generateInvoiceNumber(period: Date, sequence: number): string {
  return `${invoicePrefix(period)}${String(sequence).padStart(4, "0")}`;
}

export function generateInstallationInvoiceNumber(period: Date, sequence: number): string {
  return `${installationInvoicePrefix(period)}${String(sequence).padStart(4, "0")}`;
}

/** Normalisasi tanggal aktivasi: jika tgl > 25 → geser ke tgl 1 bulan berikutnya. */
export function normalizeActivationDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return dateStr;
  if (d <= 25) return dateStr;
  // Shift to 1st of next month; JS month overflow rolls over (13 → Jan next year)
  const nextMonth = new Date(y, m, 1); // m is 1-indexed, JS treats m as 0-indexed → next month
  return toLocalDateStr(nextMonth);
}

/** Hitung batas akhir pembayaran = tanggal 27 pada bulan jatuh tempo (dueDate). */
export function getBatasAkhir(dueDateStr: string): string {
  const parts = dueDateStr.split("-");
  if (parts.length !== 3) return dueDateStr;
  const y = Number(parts[0]), m = Number(parts[1]);
  if (Number.isNaN(y) || Number.isNaN(m)) return dueDateStr;
  return toLocalDateStr(new Date(y, m - 1, 27));
}

/** Format date string as "Bulan Tahun" (e.g., "Juni 2026"). */
export function formatMonthYear(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length < 2) return dateStr;
  const y = Number(parts[0]), m = Number(parts[1]);
  if (Number.isNaN(y) || Number.isNaN(m)) return dateStr;
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

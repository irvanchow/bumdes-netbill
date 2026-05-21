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

export function generateInvoiceNumber(period: Date, sequence: number): string {
  const year = period.getFullYear();
  const month = String(period.getMonth() + 1).padStart(2, "0");
  const seq = String(sequence).padStart(4, "0");
  return `INV-${year}${month}-${seq}`;
}

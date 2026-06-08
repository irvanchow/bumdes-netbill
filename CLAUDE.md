@AGENTS.md

# Konvensi Project

## Stack
- Next.js 16.2.6 (App Router, Turbopack) + React 19.2.4
- Auth.js v5 beta (next-auth)
- Drizzle ORM + PostgreSQL 16
- Tailwind CSS v4 + shadcn/ui (komponen di `src/components/ui/`)
- Zod untuk validasi (lihat `src/lib/validators.ts`)

## Bahasa & Lokalisasi
- Semua teks UI, label, toast, dan commit message dalam **Bahasa Indonesia**
- Format mata uang: `formatRupiah()` → `Rp 123.000` (locale `id-ID`)
- Format tanggal panjang: `formatDate()` → `7 Juni 2026`
- Format pendek: `formatShortDate()` → `07/06/2026`
- Status pelanggan: hanya `aktif` / `tidak_aktif` (lihat `customerStatusLabel`)

## Timezone
- Server berjalan di **Asia/Makassar (WITA, UTC+8)**
- **JANGAN** pakai `Date.toISOString()` untuk simpan tanggal — geser hari di UTC+8
- Pakai `toLocalDateStr(date)` di `src/lib/utils.ts` untuk format `YYYY-MM-DD` lokal
- Untuk tanggal pembayaran: konversi ke WITA via `toLocaleString("en-US", { timeZone: "Asia/Makassar" })` lalu format manual

## Penomoran Invoice & Transaksi
- Tagihan bulanan: `INV-YYYYMM-NNNN` (mis. `INV-202606-0001`)
- Tagihan instalasi: `INV-NYYYYMM-NNNN` (prefix `N` untuk membedakan)
- Transaksi pembayaran: `TRX-YYYYMMDD-NNNN`
- Multi-bill payment: base code + suffix `-1`, `-2`, dst per tagihan (mis. `TRX-20260607-0042-1`)
- Helper: `invoicePrefix()`, `installationInvoicePrefix()`, `generateInvoiceNumber()` di `utils.ts`

## Aturan Billing
- **Tanggal aktivasi > 25** otomatis digeser ke tanggal 1 bulan berikutnya (`normalizeActivationDate`)
- Tagihan bulan pertama = activationDate + 1 bulan
- Due date tagihan = `activationDay` di bulan tagihan (clamp ke last day kalau > 28-30-31)
- Batas akhir pembayaran = tanggal 27 di bulan jatuh tempo (`getBatasAkhir`)
- Periode billing ditampilkan sebagai `BulanAwal-BulanBerikut Tahun` (mis. `Juni-Juli 2026`) via `formatBillingPeriod()`
- Generate tagihan auto-skip kalau periode sudah ada (idempoten)

## Struktur Folder
- `src/app/(dashboard)/` — halaman dashboard (route group, butuh auth)
- `src/app/api/` — API routes (`/api/pelanggan`, `/api/tagihan`, `/api/pembayaran`, dst)
- `src/lib/db/schema.ts` — definisi schema Drizzle (jangan ubah `bills`/`payments` tanpa generate migration)
- `src/lib/billing.ts` — logika generate tagihan & update status
- `src/lib/esc-pos.ts` — builder struk thermal (Bluetooth) + builder text WhatsApp
- `src/components/` — komponen reusable (kebab-case)

## Database
- ORM: Drizzle. Migrasi via `npm run db:generate` lalu `npm run db:migrate`
- **Pelanggan & paket**: relasi 1-N (pelanggan punya satu paket aktif via `packageId`)
- **Tagihan (bills)** punya `billType`: `bulanan` atau `instalasi`
- **Pembayaran (payments)**: 1 row = 1 tagihan, multi-bill payment = N row dengan `transactionCode` ber-suffix
- Status tagihan: `belum_bayar` / `lunas` (label UI: "Belum Lunas" / "Lunas")

## Cetak Struk
- Bluetooth thermal printer 58mm (32 char/baris) — pakai komponen `PrintReceiptButton` (single) atau `PrintMultiReceiptButton` (multi)
- WhatsApp: kirim text plain via `wa.me/<phone>?text=...`, builder `buildReceiptText` / `buildMultiReceiptText`
- Header struk: nama app dari settings, alamat: `BumDesa "GIRI MANDALA"`
- Footer: "Simpan struk ini sebagai bukti pembayaran yang sah."

## Notifikasi WA (Fonnte)
- Kirim otomatis via API Fonnte (`https://api.fonnte.com/send`), helper di `src/lib/fonnte.ts`
- Token: env `FONNTE_TOKEN` (header `Authorization: <token>`)
- Pengingat tagihan H-3 jatuh tempo: endpoint `POST /api/cron/reminder-wa` (auth `Bearer CRON_SECRET`)
- Hanya tagihan `billType=bulanan` & `status=belum_bayar`; pelanggan tanpa nomor HP di-skip
- Cron VPS jam 07:00 WITA (`0 7 * * *`)
- Dry-run preview: tambahkan `?dryRun=1` di query
- Builder pesan: `buildReminderText()` di `src/lib/wa-templates.ts`

## Naming
- Branch tetap `main` (tidak pakai feature branch — solo dev)
- Commit message: bahasa Indonesia, prefix `feat:` / `fix:` / `chore:` (lihat git log untuk style)
- File komponen: kebab-case (`print-multi-receipt-button.tsx`)
- Variabel/fungsi: camelCase, bahasa Inggris (mis. `selectedBills`, `handleAddMonth`)
- Label UI: bahasa Indonesia ("Tambah Bulan", "Generate Tagihan", "Belum Lunas")

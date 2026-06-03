import { z } from "zod";

export const paketSchema = z.object({
  name: z.string().min(1, "Nama paket wajib diisi"),
  speed: z.string().min(1, "Kecepatan wajib diisi"),
  monthlyPrice: z.number().min(1, "Harga wajib diisi"),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const pelangganSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  address: z.string().min(1, "Alamat wajib diisi"),
  phone: z.string().min(1, "No. telepon wajib diisi"),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  packageId: z.string().uuid("Paket wajib dipilih"),
  category: z.enum(["wireless_broadband", "fiber_optik"], { message: "Kategori wajib dipilih" }),
  registrationDate: z.string().min(1, "Tanggal registrasi wajib diisi"),
  activationDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => {
        if (!val) return true; // kosong/undefined → lolos
        const day = Number(val.split("-")[2]);
        if (Number.isNaN(day)) return true; // biar validasi format lain yang urus
        return day !== 26 && day !== 27;
      },
      { message: "Tanggal aktivasi tidak boleh tanggal 26 atau 27 (tidak ada instalasi)" }
    ),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  assignedCollectorId: z.string().uuid().optional().or(z.literal("")),
});

export const pembayaranSchema = z.object({
  billId: z.string().uuid("Tagihan wajib dipilih"),
  amountPaid: z.number().min(1, "Jumlah bayar wajib diisi"),
  paymentDate: z.string().min(1, "Tanggal bayar wajib diisi"),
  paymentMethod: z.enum(["tunai", "transfer"]),
  proofImageUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const settingsSchema = z.object({
  appName: z.string().min(1, "Nama aplikasi wajib diisi"),
  bumdesAddress: z.string().min(1, "Alamat wajib diisi"),
  invoiceFooterText: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
});

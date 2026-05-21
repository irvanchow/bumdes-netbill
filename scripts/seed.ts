import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as schema from "../src/lib/db/schema";

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const [admin] = await db
    .insert(schema.users)
    .values({
      name: "Administrator",
      email: "admin@bumdes.id",
      passwordHash: adminPassword,
      role: "admin",
      phone: "081234567890",
    })
    .returning();
  console.log("Created admin user:", admin.email);

  // Create collector user
  const collectorPassword = await bcrypt.hash("collector123", 10);
  const [collector] = await db
    .insert(schema.users)
    .values({
      name: "Kolektor 1",
      email: "collector@bumdes.id",
      passwordHash: collectorPassword,
      role: "collector",
      phone: "081234567891",
    })
    .returning();
  console.log("Created collector user:", collector.email);

  // Create internet packages
  const packages = await db
    .insert(schema.internetPackages)
    .values([
      {
        name: "Paket Khusus",
        category: "wireless_broadband",
        speed: "Up to 5 Mbps",
        monthlyPrice: 100000,
        description: "Paket Minim Pengguna",
      },
      {
        name: "Paket Rumah Tangga",
        category: "wireless_broadband",
        speed: "Up to 10 Mbps",
        monthlyPrice: 150000,
        description: "Pengguna Max 4 Orang",
      },
      {
        name: "Paket Bisnis",
        category: "fiber_optik",
        speed: "Up to 20 Mbps",
        monthlyPrice: 200000,
        description: "Pengguna TV, CCTV",
      },
      {
        name: "Paket Bisnis Plus",
        category: "fiber_optik",
        speed: "Up to 25 Mbps",
        monthlyPrice: 250000,
        description: "Pengguna TV,CCTV",
      },
    ])
    .returning();
  console.log("Created", packages.length, "internet packages");

  // Create sample customers
  const customers = await db
    .insert(schema.customers)
    .values([
      {
        name: "Budi Santoso",
        address: "Jl. Merdeka No. 10, Desa Jelijih Punggang",
        phone: "081111111111",
        email: "budi@email.com",
        packageId: packages[0].id,
        registrationDate: "2025-01-01",
        activationDate: "2025-01-04",
        status: "aktif",
        assignedCollectorId: collector.id,
      },
      {
        name: "Siti Rahayu",
        address: "Jl. Mawar No. 5, Desa Jelijih Punggang",
        phone: "081222222222",
        email: "siti@email.com",
        packageId: packages[1].id,
        registrationDate: "2025-02-15",
        activationDate: "2025-02-18",
        status: "aktif",
        assignedCollectorId: collector.id,
      },
      {
        name: "Ahmad Hidayat",
        address: "Jl. Kenanga No. 8, Desa Jelijih Punggang",
        phone: "081333333333",
        packageId: packages[2].id,
        registrationDate: "2025-03-01",
        activationDate: "2025-03-04",
        status: "aktif",
        assignedCollectorId: collector.id,
      },
      {
        name: "Dewi Lestari",
        address: "Jl. Anggrek No. 12, Desa Jelijih Punggang",
        phone: "081444444444",
        email: "dewi@email.com",
        packageId: packages[0].id,
        registrationDate: "2025-01-15",
        activationDate: "2025-01-18",
        status: "aktif",
        assignedCollectorId: collector.id,
      },
      {
        name: "Eko Prasetyo",
        address: "Jl. Dahlia No. 3, Desa Jelijih Punggang",
        phone: "081555555555",
        packageId: packages[1].id,
        registrationDate: "2025-04-01",
        activationDate: "2025-04-04",
        status: "nonaktif",
        assignedCollectorId: collector.id,
      },
    ])
    .returning();
  console.log("Created", customers.length, "customers");

  // Create app settings
  await db.insert(schema.appSettings).values({
    appName: "BumDes Net - Jelijih Punggang",
    bumdesAddress: "Desa Jelijih Punggang, Kecamatan Pupuan, Kabupaten Tabanan, Bali",
    invoiceFooterText: "Terima kasih atas pembayaran Anda. Hubungi kami di 081234567890 untuk pertanyaan.",
  });
  console.log("Created app settings");

  // Create overdue bills for Dewi Lestari (2 months unpaid)
  const dewiCustomer = customers.find((c) => c.name === "Dewi Lestari")!;
  const dewiPackage = packages[0]; // Paket Hemat - 100000

  const bills = await db
    .insert(schema.bills)
    .values([
      {
        customerId: dewiCustomer.id,
        billPeriod: "2026-04-01",
        amount: dewiPackage.monthlyPrice,
        status: "belum_bayar",
        dueDate: "2026-04-15",
        invoiceNumber: "INV-202604-0001",
      },
      {
        customerId: dewiCustomer.id,
        billPeriod: "2026-05-01",
        amount: dewiPackage.monthlyPrice,
        status: "belum_bayar",
        dueDate: "2026-05-15",
        invoiceNumber: "INV-202605-0001",
      },
    ])
    .returning();
  console.log("Created", bills.length, "overdue bills for Dewi Lestari");

  console.log("\nSeeding complete!");
  console.log("\nLogin credentials:");
  console.log("  Admin: admin@bumdes.id / admin123");
  console.log("  Collector: collector@bumdes.id / collector123");

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, payments, customers } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, email, password, role, phone } = body;

  if (!name || !email || !role) {
    return NextResponse.json({ error: "Nama, email, dan role wajib diisi" }, { status: 400 });
  }

  if (!["admin", "collector"].includes(role)) {
    return NextResponse.json({ error: "Role harus admin atau collector" }, { status: 400 });
  }

  // Check if email already used by another user
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length > 0 && existing[0].id !== id) {
    return NextResponse.json({ error: "Email sudah digunakan user lain" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    name,
    email,
    role,
    phone: phone || null,
    updatedAt: new Date(),
  };

  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
  });

  if (!updated) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Prevent deleting self
  if (session.user?.id === id) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
  }

  // Cek referensi: user tidak boleh dihapus jika masih punya riwayat transaksi
  // atau ditugaskan ke pelanggan (FK NO ACTION akan memblokir delete di DB).
  const [{ paymentCount }] = await db
    .select({ paymentCount: sql<number>`count(*)::int` })
    .from(payments)
    .where(eq(payments.collectorId, id));

  const [{ customerCount }] = await db
    .select({ customerCount: sql<number>`count(*)::int` })
    .from(customers)
    .where(eq(customers.assignedCollectorId, id));

  if (paymentCount > 0 || customerCount > 0) {
    return NextResponse.json(
      {
        error:
          "User tidak bisa dihapus karena masih memiliki riwayat transaksi atau pelanggan yang ditugaskan. Riwayat pembayaran tetap perlu dipertahankan.",
      },
      { status: 409 }
    );
  }

  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });

  if (!deleted) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ message: "User berhasil dihapus" });
}

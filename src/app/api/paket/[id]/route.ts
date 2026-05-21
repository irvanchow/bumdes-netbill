import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { internetPackages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { paketSchema } from "@/lib/validators";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [pkg] = await db
    .select()
    .from(internetPackages)
    .where(eq(internetPackages.id, id))
    .limit(1);

  if (!pkg) return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ data: pkg });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const parsed = paketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [updated] = await db
    .update(internetPackages)
    .set({
      name: parsed.data.name,
      category: parsed.data.category,
      speed: parsed.data.speed,
      monthlyPrice: parsed.data.monthlyPrice,
      description: parsed.data.description || null,
      updatedAt: new Date(),
    })
    .where(eq(internetPackages.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [updated] = await db
    .update(internetPackages)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(internetPackages.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ data: updated });
}

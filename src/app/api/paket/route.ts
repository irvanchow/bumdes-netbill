import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { internetPackages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { paketSchema } from "@/lib/validators";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const packages = await db
    .select()
    .from(internetPackages)
    .orderBy(internetPackages.monthlyPrice);

  return NextResponse.json({ data: packages });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = paketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [newPackage] = await db
    .insert(internetPackages)
    .values({
      name: parsed.data.name,
      category: parsed.data.category,
      speed: parsed.data.speed,
      monthlyPrice: parsed.data.monthlyPrice,
      description: parsed.data.description || null,
    })
    .returning();

  return NextResponse.json({ data: newPackage }, { status: 201 });
}

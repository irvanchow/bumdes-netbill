import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await db
    .select({
      id: customers.id,
      name: customers.name,
      address: customers.address,
      status: customers.status,
      latitude: customers.latitude,
      longitude: customers.longitude,
    })
    .from(customers)
    .where(
      sql`${customers.latitude} IS NOT NULL AND ${customers.longitude} IS NOT NULL`
    );

  return NextResponse.json({ data });
}

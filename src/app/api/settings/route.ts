import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { settingsSchema } from "@/lib/validators";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [settings] = await db.select().from(appSettings).limit(1);

  if (!settings) {
    return NextResponse.json({ data: null });
  }

  return NextResponse.json({ data: settings });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [existing] = await db.select().from(appSettings).limit(1);

  let result;
  if (existing) {
    [result] = await db
      .update(appSettings)
      .set({
        appName: parsed.data.appName,
        bumdesAddress: parsed.data.bumdesAddress,
        invoiceFooterText: parsed.data.invoiceFooterText || null,
        logoUrl: parsed.data.logoUrl !== undefined ? parsed.data.logoUrl : existing.logoUrl,
        updatedAt: new Date(),
      })
      .where(eq(appSettings.id, existing.id))
      .returning();
  } else {
    [result] = await db
      .insert(appSettings)
      .values({
        appName: parsed.data.appName,
        bumdesAddress: parsed.data.bumdesAddress,
        invoiceFooterText: parsed.data.invoiceFooterText || null,
        logoUrl: parsed.data.logoUrl || null,
      })
      .returning();
  }

  return NextResponse.json({ data: result });
}

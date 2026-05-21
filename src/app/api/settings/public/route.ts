import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

export async function GET() {
  const [settings] = await db
    .select({
      appName: appSettings.appName,
      logoUrl: appSettings.logoUrl,
    })
    .from(appSettings)
    .limit(1);

  return NextResponse.json({
    data: settings || { appName: "Bill BumdesNET", logoUrl: null },
  });
}

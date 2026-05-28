import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Format file tidak didukung. Gunakan JPG, PNG, atau WebP." }, { status: 400 });
  }

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: "Ukuran file maksimal 2MB" }, { status: 400 });
  }

  const [existing] = await db.select().from(appSettings).limit(1);

  // Delete old logo file if exists
  if (existing?.logoUrl) {
    try {
      const oldPath = path.join(process.cwd(), "public", existing.logoUrl);
      await unlink(oldPath);
    } catch {}
  }

  // Save file to public/uploads/logo/
  const uploadDir = path.join(process.cwd(), "public", "uploads", "logo");
  await mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name);
  const filename = `logo-${Date.now()}${ext}`;
  const filepath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  const logoUrl = `/uploads/logo/${filename}`;

  // Update database
  if (existing) {
    await db
      .update(appSettings)
      .set({ logoUrl, updatedAt: new Date() })
      .where(eq(appSettings.id, existing.id));
  } else {
    await db.insert(appSettings).values({
      appName: "Bill BumdesNET",
      bumdesAddress: "",
      logoUrl,
    });
  }

  return NextResponse.json({ url: logoUrl }, { status: 201 });
}

"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Globe, Upload, Trash2 } from "lucide-react";

interface Settings {
  id: string;
  appName: string;
  bumdesAddress: string;
  logoUrl: string | null;
  invoiceFooterText: string | null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    fetch("/api/settings")
      .then((res) => res.json())
      .then((res) => setSettings(res.data))
      .finally(() => setLoading(false));
  }, [session, router]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        setSettings((prev) => prev ? { ...prev, logoUrl: json.url } : prev);
        toast.success("Logo berhasil diupload");
      } else {
        const json = await res.json();
        toast.error(json.error || "Gagal upload logo");
      }
    } catch {
      toast.error("Gagal upload logo");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeleteLogo() {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appName: settings?.appName || "Bill BumdesNET",
        bumdesAddress: settings?.bumdesAddress || "",
        invoiceFooterText: settings?.invoiceFooterText || "",
        logoUrl: null,
      }),
    });

    if (res.ok) {
      setSettings((prev) => prev ? { ...prev, logoUrl: null } : prev);
      toast.success("Logo berhasil dihapus");
    } else {
      toast.error("Gagal menghapus logo");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      appName: formData.get("appName") as string,
      bumdesAddress: formData.get("bumdesAddress") as string,
      invoiceFooterText: formData.get("invoiceFooterText") as string,
    };

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const json = await res.json();
      setSettings(json.data);
      toast.success("Pengaturan berhasil disimpan");
    } else {
      toast.error("Gagal menyimpan pengaturan");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Pengaturan</h1>
        <div className="max-w-lg h-60 rounded-lg bg-card border border-border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Pengaturan</h1>
        <p className="text-sm text-muted-foreground mt-1">Konfigurasi aplikasi dan invoice</p>
      </div>

      <Card className="max-w-lg border-border shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Pengaturan Aplikasi</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="appName" className="text-sm text-foreground">Nama Aplikasi</Label>
              <Input
                id="appName"
                name="appName"
                defaultValue={settings?.appName || ""}
                placeholder="BumDes Net"
                required
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bumdesAddress" className="text-sm text-foreground">Alamat BumDes</Label>
              <Textarea
                id="bumdesAddress"
                name="bumdesAddress"
                defaultValue={settings?.bumdesAddress || ""}
                placeholder="Alamat lengkap BumDes"
                required
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceFooterText" className="text-sm text-foreground">Teks Footer Invoice</Label>
              <Textarea
                id="invoiceFooterText"
                name="invoiceFooterText"
                defaultValue={settings?.invoiceFooterText || ""}
                placeholder="Teks yang muncul di bagian bawah invoice..."
                className="bg-card border-border"
              />
              <p className="text-xs text-muted-foreground">
                Teks ini akan ditampilkan di bagian bawah setiap invoice PDF.
              </p>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Logo Aplikasi</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-lg border border-border bg-muted/50 overflow-hidden">
                  {settings?.logoUrl ? (
                    <img
                      src={settings.logoUrl + "?t=" + Date.now()}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Globe className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {uploading ? "Mengupload..." : "Pilih File"}
                    </Button>
                    {settings?.logoUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteLogo}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Hapus
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Format: JPG, PNG, WebP. Maksimal 2MB.
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>

            <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

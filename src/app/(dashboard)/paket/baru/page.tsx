"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TambahPaketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      speed: formData.get("speed") as string,
      monthlyPrice: parseInt(formData.get("monthlyPrice") as string),
      description: formData.get("description") as string,
    };

    const res = await fetch("/api/paket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Paket berhasil ditambahkan");
      router.push("/paket");
    } else {
      const err = await res.json();
      toast.error("Gagal menambahkan paket");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/paket">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Tambah Paket Internet</h1>
      </div>

      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Paket</Label>
              <Input id="name" name="name" placeholder="Paket Hemat" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <select
                id="category"
                name="category"
                required
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                <option value="wireless_broadband">Wireless Broadband</option>
                <option value="fiber_optik">Fiber Optik</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="speed">Kecepatan</Label>
              <Input id="speed" name="speed" placeholder="10 Mbps" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyPrice">Harga per Bulan (Rp)</Label>
              <Input
                id="monthlyPrice"
                name="monthlyPrice"
                type="number"
                placeholder="150000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (opsional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Deskripsi paket..."
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
              <Link href="/paket">
                <Button type="button" variant="outline">Batal</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

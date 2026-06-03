"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Package {
  id: string;
  name: string;
  speed: string;
  monthlyPrice: number;
  description: string | null;
  isActive: boolean;
}

export default function EditPaketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pkg, setPkg] = useState<Package | null>(null);

  useEffect(() => {
    fetch(`/api/paket/${id}`)
      .then((res) => res.json())
      .then((res) => setPkg(res.data));
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      speed: formData.get("speed") as string,
      monthlyPrice: parseInt(formData.get("monthlyPrice") as string),
      description: formData.get("description") as string,
    };

    const res = await fetch(`/api/paket/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Paket berhasil diperbarui");
      router.push("/paket");
    } else {
      toast.error("Gagal memperbarui paket");
    }
    setLoading(false);
  }

  if (!pkg) {
    return <div className="animate-pulse p-4">Memuat...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/paket">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Paket Internet</h1>
      </div>

      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Paket</Label>
              <Input id="name" name="name" defaultValue={pkg.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="speed">Kecepatan</Label>
              <Input id="speed" name="speed" defaultValue={pkg.speed} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyPrice">Harga per Bulan (Rp)</Label>
              <Input
                id="monthlyPrice"
                name="monthlyPrice"
                type="number"
                defaultValue={pkg.monthlyPrice}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (opsional)</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={pkg.description || ""}
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

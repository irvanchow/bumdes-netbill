"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LocationPicker } from "@/components/location-picker";

interface Package {
  id: string;
  name: string;
  speed: string;
  monthlyPrice: number;
}

interface Collector {
  id: string;
  name: string;
}

export default function TambahPelangganPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/paket")
      .then((res) => res.json())
      .then((res) => setPackages((res.data || []).filter((p: Package & { isActive: boolean }) => p.isActive)));
    fetch("/api/users?role=collector")
      .then((res) => res.json())
      .then((res) => setCollectors(res.data || []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      packageId: formData.get("packageId") as string,
      registrationDate: formData.get("registrationDate") as string,
      activationDate: formData.get("activationDate") as string,
      latitude,
      longitude,
      assignedCollectorId: formData.get("assignedCollectorId") as string,
    };

    const res = await fetch("/api/pelanggan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Pelanggan berhasil ditambahkan");
      router.push("/pelanggan");
    } else {
      toast.error("Gagal menambahkan pelanggan");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/pelanggan">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Tambah Pelanggan</h1>
      </div>

      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input id="name" name="name" placeholder="Nama pelanggan" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea id="address" name="address" placeholder="Alamat lengkap" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">No. Telepon</Label>
                <Input id="phone" name="phone" placeholder="08xxxxxxxxxx" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (opsional)</Label>
                <Input id="email" name="email" type="email" placeholder="email@contoh.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="packageId">Paket Internet</Label>
              <select
                id="packageId"
                name="packageId"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pilih paket...</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} - {pkg.speed} ({new Intl.NumberFormat("id-ID").format(pkg.monthlyPrice)}/bln)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registrationDate">Tanggal Registrasi</Label>
                <Input id="registrationDate" name="registrationDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activationDate">Tanggal Aktivasi</Label>
                <Input id="activationDate" name="activationDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedCollectorId">Collector (opsional)</Label>
              <select
                id="assignedCollectorId"
                name="assignedCollectorId"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pilih collector...</option>
                {collectors.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Lokasi Pemasangan</Label>
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
              <Link href="/pelanggan">
                <Button type="button" variant="outline">Batal</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

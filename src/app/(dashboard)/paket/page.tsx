"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface Package {
  id: string;
  name: string;
  speed: string;
  monthlyPrice: number;
  description: string | null;
  isActive: boolean;
}

export default function PaketPage() {
  const { data: session } = useSession();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = session?.user?.role === "admin";

  const fetchPackages = () => {
    fetch("/api/paket")
      .then((res) => res.json())
      .then((res) => setPackages(res.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleToggleActive = async (pkg: Package) => {
    const action = pkg.isActive ? "nonaktifkan" : "aktifkan";
    if (!confirm(`Yakin ingin ${action} paket "${pkg.name}"?`)) return;

    const res = await fetch(`/api/paket/${pkg.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: pkg.name,
        speed: pkg.speed,
        monthlyPrice: pkg.monthlyPrice,
        description: pkg.description || "",
        isActive: !pkg.isActive,
      }),
    });

    if (res.ok) {
      toast.success(`Paket berhasil di${action}`);
      fetchPackages();
    } else {
      toast.error(`Gagal ${action} paket`);
    }
  };

  const handleDelete = async (pkg: Package) => {
    if (!confirm(`Yakin ingin menghapus paket "${pkg.name}"? Paket akan dinonaktifkan secara permanen.`)) return;

    const res = await fetch(`/api/paket/${pkg.id}`, { method: "DELETE" });

    if (res.ok) {
      toast.success("Paket berhasil dihapus");
      fetchPackages();
    } else {
      toast.error("Gagal menghapus paket");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Paket Internet</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-lg bg-card border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Paket Internet</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola paket layanan internet</p>
        </div>
        {isAdmin && (
          <Link href="/paket/baru">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Paket
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <Card key={pkg.id} className="border-border shadow-none hover:shadow-sm transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium text-foreground">{pkg.name}</CardTitle>
              <Badge variant={pkg.isActive ? "default" : "secondary"} className={pkg.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" : "bg-muted text-muted-foreground border border-border"}>
                {pkg.isActive ? "Aktif" : "Nonaktif"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-2xl font-semibold text-foreground">
                  {formatRupiah(pkg.monthlyPrice)}
                  <span className="text-sm font-normal text-muted-foreground">/bulan</span>
                </p>
                <p className="text-sm text-muted-foreground">Kecepatan: {pkg.speed}</p>
                {pkg.description && (
                  <p className="text-sm text-muted-foreground">{pkg.description}</p>
                )}
                {isAdmin && (
                  <div className="flex items-center gap-1 mt-1">
                    <Link href={`/paket/${pkg.id}`}>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={pkg.isActive ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                      onClick={() => handleToggleActive(pkg)}
                    >
                      <Power className="h-3.5 w-3.5 mr-1" />
                      {pkg.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(pkg)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Hapus
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {packages.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">Belum ada paket internet. Klik tombol &quot;Tambah Paket&quot; untuk menambahkan.</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface Package {
  id: string;
  name: string;
  category: string;
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

  useEffect(() => {
    fetch("/api/paket")
      .then((res) => res.json())
      .then((res) => setPackages(res.data || []))
      .finally(() => setLoading(false));
  }, []);

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
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {pkg.category === "wireless_broadband" ? "Wireless Broadband" : "Fiber Optik"}
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {formatRupiah(pkg.monthlyPrice)}
                  <span className="text-sm font-normal text-muted-foreground">/bulan</span>
                </p>
                <p className="text-sm text-muted-foreground">Kecepatan: {pkg.speed}</p>
                {pkg.description && (
                  <p className="text-sm text-muted-foreground">{pkg.description}</p>
                )}
                {isAdmin && (
                  <Link href={`/paket/${pkg.id}`}>
                    <Button variant="ghost" size="sm" className="mt-1 text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </Link>
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

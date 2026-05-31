"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface RekapRow {
  period: string;
  totalBills: number;
  paidBills: number;
  unpaidBills: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

interface Summary {
  totalBills: number;
  paidBills: number;
  unpaidBills: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  collectionRate: number;
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

export default function RekapTagihanPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<RekapRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalBills: 0, paidBills: 0, unpaidBills: 0,
    totalAmount: 0, paidAmount: 0, unpaidAmount: 0, collectionRate: 0,
  });
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [collectors, setCollectors] = useState<{ id: string; name: string }[]>([]);
  const [collectorId, setCollectorId] = useState("");
  const [loading, setLoading] = useState(true);
  const isAdmin = session?.user?.role === "admin";

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/users?role=collector")
        .then((res) => res.json())
        .then((res) => setCollectors(res.data || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ year });
    if (collectorId) params.set("collectorId", collectorId);

    const res = await fetch(`/api/laporan/rekap-tagihan?${params}`);
    const json = await res.json();
    setData(json.data || []);
    setSummary(json.summary || {
      totalBills: 0, paidBills: 0, unpaidBills: 0,
      totalAmount: 0, paidAmount: 0, unpaidAmount: 0, collectionRate: 0,
    });
    setLoading(false);
  }, [year, collectorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Laporan Rekap Tagihan</h1>
          <p className="text-sm text-muted-foreground mt-1">Ringkasan status tagihan per bulan</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border shadow-none">
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tahun</Label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {isAdmin && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Collector</Label>
                <select
                  value={collectorId}
                  onChange={(e) => setCollectorId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Semua Collector</option>
                  {collectors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-end">
              <a
                href={`/api/laporan/rekap-tagihan/cetak?year=${year}${collectorId ? `&collectorId=${collectorId}` : ""}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Download className="h-4 w-4 mr-2" />
                  Cetak Laporan
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Total Tagihan</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{summary.totalBills}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Lunas</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{summary.paidBills}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Belum Bayar</p>
          <p className="text-2xl font-semibold text-rose-600 dark:text-rose-400 mt-1">{summary.unpaidBills}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Tingkat Koleksi</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{summary.collectionRate}%</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-40 rounded-lg bg-card border border-border animate-pulse" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Periode</th>
                  <th className="text-right p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Total</th>
                  <th className="text-right p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Lunas</th>
                  <th className="text-right p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Belum Bayar</th>
                  <th className="text-right p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Nominal Total</th>
                  <th className="text-right p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Terbayar</th>
                  <th className="text-right p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Belum Terbayar</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.period} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="p-4 font-medium text-foreground">{formatPeriod(row.period)}</td>
                    <td className="p-4 text-right text-foreground">{row.totalBills}</td>
                    <td className="p-4 text-right text-emerald-600 dark:text-emerald-400">{row.paidBills}</td>
                    <td className="p-4 text-right text-rose-600 dark:text-rose-400">{row.unpaidBills}</td>
                    <td className="p-4 text-right text-foreground">{formatRupiah(row.totalAmount)}</td>
                    <td className="p-4 text-right text-emerald-600 dark:text-emerald-400">{formatRupiah(row.paidAmount)}</td>
                    <td className="p-4 text-right text-rose-600 dark:text-rose-400">{formatRupiah(row.unpaidAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {data.map((row) => (
              <Card key={row.period} className="border-border">
                <CardContent className="p-4">
                  <p className="font-medium text-foreground mb-3">{formatPeriod(row.period)}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-sm font-medium text-foreground">{row.totalBills}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Lunas</p>
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{row.paidBills}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Belum</p>
                      <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{row.unpaidBills}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">Terbayar</span>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatRupiah(row.paidAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Belum Terbayar</span>
                    <span className="text-sm font-medium text-rose-600 dark:text-rose-400">{formatRupiah(row.unpaidAmount)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">Tidak ada data tagihan untuk tahun yang dipilih.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

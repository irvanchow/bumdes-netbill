"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface Breakdown {
  total: number;
  isp: number;
  bumdesa: number;
}

interface MonthlyData {
  period: string;
  instalasi: Breakdown;
  fiberOptik: Breakdown;
  wirelessBroadband: Breakdown;
  totalIsp: number;
  totalBumdesa: number;
}

interface Summary {
  totalRevenue: number;
  totalIsp: number;
  totalBumdesa: number;
  instalasi: Breakdown;
  fiberOptik: Breakdown;
  wirelessBroadband: Breakdown;
}

function formatPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(m)) return period;
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export default function ShareRevenuePage() {
  const { data: session } = useSession();
  const [data, setData] = useState<MonthlyData[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalRevenue: 0, totalIsp: 0, totalBumdesa: 0,
    instalasi: { total: 0, isp: 0, bumdesa: 0 },
    fiberOptik: { total: 0, isp: 0, bumdesa: 0 },
    wirelessBroadband: { total: 0, isp: 0, bumdesa: 0 },
  });
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.substring(0, 7) + "-01";
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [collectors, setCollectors] = useState<{ id: string; name: string }[]>([]);
  const [collectorId, setCollectorId] = useState("");
  const [loading, setLoading] = useState(true);
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/users?role=collector")
        .then((res) => res.json())
        .then((res) => setCollectors(res.data || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (collectorId) params.set("collectorId", collectorId);

    const res = await fetch(`/api/laporan/share-revenue?${params}`);
    const json = await res.json();
    setData(json.data || []);
    setSummary(json.summary || { totalRevenue: 0, totalIsp: 0, totalBumdesa: 0, instalasi: { total: 0, isp: 0, bumdesa: 0 }, fiberOptik: { total: 0, isp: 0, bumdesa: 0 }, wirelessBroadband: { total: 0, isp: 0, bumdesa: 0 } });
    setLoading(false);
  }, [startDate, endDate, collectorId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Laporan Share Revenue</h1>
          <p className="text-sm text-muted-foreground mt-1">Bagi hasil pendapatan antara ISP dan BumDesa</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border shadow-none">
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dari Tanggal</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sampai Tanggal</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-card border-border"
              />
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
                href={`/api/laporan/share-revenue/cetak?startDate=${startDate}&endDate=${endDate}${collectorId ? `&collectorId=${collectorId}` : ""}`}
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

      {/* Main Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Total Pendapatan</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{formatRupiah(summary.totalRevenue)}</p>
        </div>
        <div className="bg-card rounded-xl border border-blue-200 dark:border-blue-800 p-5">
          <p className="text-sm text-muted-foreground">Bagi Hasil ISP</p>
          <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mt-1">{formatRupiah(summary.totalIsp)}</p>
        </div>
        <div className="bg-card rounded-xl border border-emerald-200 dark:border-emerald-800 p-5">
          <p className="text-sm text-muted-foreground">Bagi Hasil BumDesa</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{formatRupiah(summary.totalBumdesa)}</p>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Instalasi */}
        <Card className="border-border shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-snug">Pendapatan dari Instalasi (80%/20%)</p>
            <p className="text-lg font-semibold text-foreground mt-2">{formatRupiah(summary.instalasi.total)}</p>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-blue-600 dark:text-blue-400">ISP: {formatRupiah(summary.instalasi.isp)}</span>
              <span className="text-emerald-600 dark:text-emerald-400">BumDesa: {formatRupiah(summary.instalasi.bumdesa)}</span>
            </div>
          </CardContent>
        </Card>
        {/* Fiber Optik */}
        <Card className="border-border shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-snug">Pendapatan dari berlangganan Fiber Optik (70%/30%)</p>
            <p className="text-lg font-semibold text-foreground mt-2">{formatRupiah(summary.fiberOptik.total)}</p>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-blue-600 dark:text-blue-400">ISP: {formatRupiah(summary.fiberOptik.isp)}</span>
              <span className="text-emerald-600 dark:text-emerald-400">BumDesa: {formatRupiah(summary.fiberOptik.bumdesa)}</span>
            </div>
          </CardContent>
        </Card>
        {/* Wireless Broadband */}
        <Card className="border-border shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-snug">Pendapatan dari berlangganan Wireless Broadband (45%/55%)</p>
            <p className="text-lg font-semibold text-foreground mt-2">{formatRupiah(summary.wirelessBroadband.total)}</p>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-blue-600 dark:text-blue-400">ISP: {formatRupiah(summary.wirelessBroadband.isp)}</span>
              <span className="text-emerald-600 dark:text-emerald-400">BumDesa: {formatRupiah(summary.wirelessBroadband.bumdesa)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Table */}
      {loading ? (
        <div className="h-40 rounded-lg bg-card border border-border animate-pulse" />
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Periode</th>
                  <th className="text-right p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Instalasi</th>
                  <th className="text-right p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Fiber Optik</th>
                  <th className="text-right p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Wireless</th>
                  <th className="text-right p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Bagi Hasil ISP</th>
                  <th className="text-right p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Bagi Hasil BumDesa</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.period} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="p-4 font-medium text-foreground">{formatPeriod(row.period)}</td>
                    <td className="p-4 text-right text-muted-foreground">
                      {row.instalasi.total > 0 ? formatRupiah(row.instalasi.total) : "-"}
                    </td>
                    <td className="p-4 text-right text-muted-foreground">
                      {row.fiberOptik.total > 0 ? formatRupiah(row.fiberOptik.total) : "-"}
                    </td>
                    <td className="p-4 text-right text-muted-foreground">
                      {row.wirelessBroadband.total > 0 ? formatRupiah(row.wirelessBroadband.total) : "-"}
                    </td>
                    <td className="p-4 text-right font-medium text-blue-600 dark:text-blue-400">{formatRupiah(row.totalIsp)}</td>
                    <td className="p-4 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatRupiah(row.totalBumdesa)}</td>
                  </tr>
                ))}
              </tbody>
              {/* Grand total row */}
              {data.length > 0 && (
                <tfoot className="border-t-2 border-border bg-accent/30">
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Total</td>
                    <td className="p-4 text-right font-semibold text-foreground">{formatRupiah(summary.instalasi.total)}</td>
                    <td className="p-4 text-right font-semibold text-foreground">{formatRupiah(summary.fiberOptik.total)}</td>
                    <td className="p-4 text-right font-semibold text-foreground">{formatRupiah(summary.wirelessBroadband.total)}</td>
                    <td className="p-4 text-right font-semibold text-blue-600 dark:text-blue-400">{formatRupiah(summary.totalIsp)}</td>
                    <td className="p-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(summary.totalBumdesa)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {data.map((row) => (
              <Card key={row.period} className="border-border">
                <CardContent className="p-4">
                  <p className="font-semibold text-foreground">{formatPeriod(row.period)}</p>
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Instalasi</p>
                      <p className="text-foreground">{row.instalasi.total > 0 ? formatRupiah(row.instalasi.total) : "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Fiber Optik</p>
                      <p className="text-foreground">{row.fiberOptik.total > 0 ? formatRupiah(row.fiberOptik.total) : "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Wireless</p>
                      <p className="text-foreground">{row.wirelessBroadband.total > 0 ? formatRupiah(row.wirelessBroadband.total) : "-"}</p>
                    </div>
                    <div />
                    <div>
                      <p className="text-xs text-muted-foreground">ISP</p>
                      <p className="text-blue-600 dark:text-blue-400 font-medium">{formatRupiah(row.totalIsp)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">BumDesa</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium">{formatRupiah(row.totalBumdesa)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">Tidak ada data pendapatan untuk filter yang dipilih.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

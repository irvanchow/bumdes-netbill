"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Download, ArrowLeft } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface BillDetail {
  id: string;
  customerName: string;
  customerPhone: string;
  packageName: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string;
  paymentDate: string | null;
  collectorName: string | null;
}

interface Summary {
  total: number;
  paid: number;
  unpaid: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatPeriodTitle(period: string) {
  const [year, month] = period.split("-");
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

export default function RekapTagihanDetailPage() {
  const params = useParams();
  const period = params.period as string;
  const { data: session } = useSession();
  const [data, setData] = useState<BillDetail[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, paid: 0, unpaid: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
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

  const fetchData = useCallback(async (page: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    if (collectorId) params.set("collectorId", collectorId);

    const res = await fetch(`/api/laporan/rekap-tagihan/${period}?${params}`);
    const json = await res.json();
    setData(json.data || []);
    setSummary(json.summary || { total: 0, paid: 0, unpaid: 0 });
    setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    setLoading(false);
  }, [period, status, search, collectorId]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/laporan/rekap-tagihan">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Detail Tagihan - {formatPeriodTitle(period)}</h1>
          <p className="text-sm text-muted-foreground mt-1">Daftar tagihan pelanggan per periode</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-3">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Total Tagihan</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{summary.total}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Lunas</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{summary.paid}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Belum Bayar</p>
          <p className="text-2xl font-semibold text-rose-600 dark:text-rose-400 mt-1">{summary.unpaid}</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border shadow-none">
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                <option value="">Semua</option>
                <option value="lunas">Lunas</option>
                <option value="belum_bayar">Belum Bayar</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cari Pelanggan</Label>
              <Input
                type="text"
                placeholder="Nama pelanggan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                href={`/api/laporan/rekap-tagihan/${period}/cetak?${status ? `status=${status}&` : ""}${collectorId ? `collectorId=${collectorId}` : ""}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Download className="h-4 w-4 mr-2" />
                  Cetak PDF
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Pelanggan</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Paket</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">No. Invoice</th>
                  <th className="text-right p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Jumlah</th>
                  <th className="text-center p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Tgl Bayar</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Collector</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-foreground">{item.customerName}</div>
                      <div className="text-xs text-muted-foreground">{item.customerPhone}</div>
                    </td>
                    <td className="p-4 text-muted-foreground">{item.packageName}</td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">{item.invoiceNumber}</td>
                    <td className="p-4 text-right font-medium text-foreground">{formatRupiah(item.amount)}</td>
                    <td className="p-4 text-center">
                      <Badge
                        variant={item.status === "lunas" ? "default" : "destructive"}
                        className={item.status === "lunas"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                          : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-50 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800"
                        }
                      >
                        {item.status === "lunas" ? "Lunas" : "Belum Bayar"}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">{item.paymentDate ? formatDate(item.paymentDate) : "-"}</td>
                    <td className="p-4 text-muted-foreground">{item.collectorName || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {data.map((item) => (
              <Card key={item.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{item.customerName}</p>
                      <p className="text-xs text-muted-foreground">{item.packageName}</p>
                    </div>
                    <Badge
                      variant={item.status === "lunas" ? "default" : "destructive"}
                      className={item.status === "lunas"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                        : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-50 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800"
                      }
                    >
                      {item.status === "lunas" ? "Lunas" : "Belum Bayar"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground font-mono">{item.invoiceNumber}</span>
                    <span className="text-sm font-medium text-foreground">{formatRupiah(item.amount)}</span>
                  </div>
                  {item.paymentDate && (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">Dibayar: {formatDate(item.paymentDate)}</span>
                      <span className="text-xs text-muted-foreground">{item.collectorName}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {data.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">Tidak ada data tagihan untuk filter yang dipilih.</p>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Menampilkan {data.length} dari {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchData(pagination.page - 1)}
                  className="border-border"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchData(pagination.page + 1)}
                  className="border-border"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

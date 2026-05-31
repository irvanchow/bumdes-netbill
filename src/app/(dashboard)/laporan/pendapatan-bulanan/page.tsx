"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface Payment {
  id: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  notes: string | null;
  collectorName: string;
  invoiceNumber: string;
  customerName: string;
  customerAddress: string;
}

interface Summary {
  totalPayments: number;
  totalAmount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PendapatanBulananPage() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalPayments: 0, totalAmount: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
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

  const fetchReport = useCallback(async (page: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (collectorId) params.set("collectorId", collectorId);

    const res = await fetch(`/api/laporan?${params}`);
    const json = await res.json();
    setPayments(json.data || []);
    setSummary(json.summary || { totalPayments: 0, totalAmount: 0 });
    setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    setLoading(false);
  }, [startDate, endDate, collectorId]);

  useEffect(() => {
    fetchReport(1);
  }, [fetchReport]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Laporan Pendapatan Bulanan</h1>
          <p className="text-sm text-muted-foreground mt-1">Ringkasan pendapatan dari pembayaran pelanggan</p>
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
                href={`/api/laporan/cetak?startDate=${startDate}&endDate=${endDate}${collectorId ? `&collectorId=${collectorId}` : ""}`}
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

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Total Transaksi</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{summary.totalPayments}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Total Pendapatan</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{formatRupiah(summary.totalAmount)}</p>
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
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Tanggal</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Pelanggan</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">No. Invoice</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Jumlah</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Metode</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Collector</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="p-4 text-muted-foreground">{formatDate(p.paymentDate)}</td>
                    <td className="p-4">
                      <div className="font-medium text-foreground">{p.customerName}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.customerAddress}</div>
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">{p.invoiceNumber}</td>
                    <td className="p-4 font-medium text-foreground">{formatRupiah(p.amountPaid)}</td>
                    <td className="p-4">
                      <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">{p.paymentMethod}</Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">{p.collectorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {payments.map((p) => (
              <Card key={p.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{p.customerName}</p>
                      <p className="text-xs text-muted-foreground">{p.invoiceNumber}</p>
                    </div>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">{p.paymentMethod}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-sm text-muted-foreground">{formatDate(p.paymentDate)}</span>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatRupiah(p.amountPaid)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {payments.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">Tidak ada data pembayaran untuk filter yang dipilih.</p>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Menampilkan {payments.length} dari {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchReport(pagination.page - 1)}
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
                  onClick={() => fetchReport(pagination.page + 1)}
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

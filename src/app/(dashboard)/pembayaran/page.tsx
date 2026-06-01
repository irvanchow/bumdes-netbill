"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatRupiah, formatDate } from "@/lib/utils";

interface Payment {
  id: string;
  transactionCode: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  notes: string | null;
  collectorName: string;
  invoiceNumber: string;
  customerName: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PembayaranPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async (page: number) => {
    setLoading(true);
    const res = await fetch(`/api/pembayaran?page=${page}&limit=10`);
    const json = await res.json();
    setPayments(json.data || []);
    setPagination(json.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pembayaran</h1>
          <p className="text-sm text-muted-foreground mt-1">Riwayat pembayaran yang telah dicatat</p>
        </div>
        <Link href="/pembayaran/baru">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Catat Pembayaran
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Kode Transaksi</th>
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
                    <td className="p-4 font-mono text-xs text-primary">{p.transactionCode}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(p.paymentDate)}</td>
                    <td className="p-4 font-medium text-foreground">{p.customerName}</td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">{p.invoiceNumber}</td>
                    <td className="p-4 font-medium text-foreground">{formatRupiah(p.amountPaid)}</td>
                    <td className="p-4">
                      <Badge variant="secondary" className={p.paymentMethod === "transfer" ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"}>{p.paymentMethod}</Badge>
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
                      <p className="text-xs text-primary font-mono">{p.transactionCode}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.invoiceNumber}</p>
                    </div>
                    <Badge variant="secondary" className={p.paymentMethod === "transfer" ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"}>{p.paymentMethod}</Badge>
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
              <p className="text-sm">Belum ada pembayaran tercatat.</p>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Menampilkan {payments.length} dari {pagination.total} pembayaran
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchPayments(pagination.page - 1)}
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
                  onClick={() => fetchPayments(pagination.page + 1)}
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

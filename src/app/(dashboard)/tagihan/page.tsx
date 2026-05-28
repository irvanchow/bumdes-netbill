"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ChevronLeft, ChevronRight, FileText, RefreshCw, MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatRupiah, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface Bill {
  id: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  packageName: string;
  billPeriod: string;
  amount: number;
  status: string;
  dueDate: string;
  invoiceNumber: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TagihanPage() {
  const { data: session } = useSession();
  const [bills, setBills] = useState<Bill[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const isAdmin = session?.user?.role === "admin";

  const fetchBills = useCallback(async (page: number, searchQuery: string, status: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (searchQuery) params.set("search", searchQuery);
    if (status) params.set("status", status);

    const res = await fetch(`/api/tagihan?${params}`);
    const json = await res.json();
    setBills(json.data || []);
    setPagination(json.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBills(1, "", "");
  }, [fetchBills]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchBills(1, search, statusFilter);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, statusFilter, fetchBills]);

  async function handleGenerate() {
    if (!confirm("Generate tagihan untuk bulan ini? Tagihan akan dibuat untuk semua pelanggan aktif.")) return;
    setGenerating(true);
    const res = await fetch("/api/tagihan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (res.ok) {
      toast.success(`Berhasil: ${json.generated} tagihan dibuat, ${json.skipped} dilewati`);
      fetchBills(1, search, statusFilter);
    } else {
      toast.error("Gagal generate tagihan");
    }
    setGenerating(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tagihan</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola tagihan bulanan pelanggan</p>
        </div>
        {isAdmin && (
          <Button onClick={handleGenerate} disabled={generating} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : "Generate Tagihan"}
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari nama pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          <option value="">Semua Status</option>
          <option value="belum_bayar">Belum Bayar</option>
          <option value="lunas">Lunas</option>
        </select>
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
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">No. Invoice</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Pelanggan</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Periode</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Jumlah</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Jatuh Tempo</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="p-4 font-mono text-xs text-muted-foreground">{bill.invoiceNumber}</td>
                    <td className="p-4">
                      <div className="font-medium text-foreground">{bill.customerName}</div>
                      <div className="text-xs text-muted-foreground">{bill.customerPhone}</div>
                    </td>
                    <td className="p-4 text-muted-foreground">{formatDate(bill.billPeriod)}</td>
                    <td className="p-4 font-medium text-foreground">{formatRupiah(bill.amount)}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(bill.dueDate)}</td>
                    <td className="p-4">
                      <Badge variant={bill.status === "lunas" ? "default" : "destructive"} className={bill.status === "lunas" ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-50 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800"}>
                        {bill.status === "lunas" ? "Lunas" : "Belum Bayar"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Link href={`/tagihan/${bill.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Detail">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </Link>
                        {bill.status === "belum_bayar" && bill.customerPhone && (
                          <a
                            href={`https://wa.me/${bill.customerPhone.replace(/^0/, "62")}?text=${encodeURIComponent(`Assalamualaikum, kami dari Bumdesa GIRI MANDALA ingin menginformasikan tagihan internet Anda:\n\nNama: ${bill.customerName}\nNo. Invoice: ${bill.invoiceNumber}\nPaket: ${bill.packageName}\nJatuh Tempo: ${formatDate(bill.dueDate)}\nJumlah: ${formatRupiah(bill.amount)}\n\nMohon segera melakukan pembayaran. Terima kasih.\n\nBumdesa GIRI MANDALA\nWA: 6289696372421`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" title="Kirim via WhatsApp">
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {bills.map((bill) => (
              <Card key={bill.id} className="hover:shadow-sm transition-shadow border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{bill.customerName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{bill.invoiceNumber}</p>
                    </div>
                    <Badge variant={bill.status === "lunas" ? "default" : "destructive"} className={bill.status === "lunas" ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-50 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800"}>
                      {bill.status === "lunas" ? "Lunas" : "Belum Bayar"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-sm text-muted-foreground">Jatuh tempo: {formatDate(bill.dueDate)}</span>
                    <span className="text-sm font-medium text-foreground">{formatRupiah(bill.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <Link href={`/tagihan/${bill.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full border-border">
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Detail
                      </Button>
                    </Link>
                    {bill.status === "belum_bayar" && bill.customerPhone && (
                      <a
                        href={`https://wa.me/${bill.customerPhone.replace(/^0/, "62")}?text=${encodeURIComponent(`Assalamualaikum, kami dari Bumdesa GIRI MANDALA ingin menginformasikan tagihan internet Anda:\n\nNama: ${bill.customerName}\nNo. Invoice: ${bill.invoiceNumber}\nPaket: ${bill.packageName}\nJatuh Tempo: ${formatDate(bill.dueDate)}\nJumlah: ${formatRupiah(bill.amount)}\n\nMohon segera melakukan pembayaran. Terima kasih.\n\nBumdesa GIRI MANDALA\nWA: 6289696372421`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button variant="outline" size="sm" className="w-full text-green-600 border-green-200 hover:bg-green-50">
                          <MessageCircle className="h-3.5 w-3.5 mr-1" />
                          WhatsApp
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {bills.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">{search || statusFilter ? "Tidak ada tagihan yang cocok." : "Belum ada tagihan. Klik \"Generate Tagihan\" untuk membuat tagihan bulan ini."}</p>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Menampilkan {bills.length} dari {pagination.total} tagihan
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchBills(pagination.page - 1, search, statusFilter)}
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
                  onClick={() => fetchBills(pagination.page + 1, search, statusFilter)}
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

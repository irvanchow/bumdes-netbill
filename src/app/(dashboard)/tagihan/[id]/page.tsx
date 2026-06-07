"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, CreditCard, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatRupiah, formatDate, formatMonthYear, formatBillingPeriod, getBatasAkhir } from "@/lib/utils";
import { PrintReceiptButton } from "@/components/print-receipt-button";

interface Payment {
  id: string;
  transactionCode: string;
  amountPaid: number;
  paymentDate: string;
  paymentTime: string | null;
  paymentMethod: string;
  collectorName: string;
  notes: string | null;
}

interface UnpaidBill {
  id: string;
  billPeriod: string;
  amount: number;
  dueDate: string;
  invoiceNumber: string;
}

interface BillDetail {
  id: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string | null;
  activationDate: string | null;
  packageName: string;
  packageSpeed: string;
  billPeriod: string;
  amount: number;
  status: string;
  billType: string;
  dueDate: string;
  invoiceNumber: string;
  payments: Payment[];
  otherUnpaidBills: UnpaidBill[];
}

export default function TagihanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [bill, setBill] = useState<BillDetail | null>(null);

  useEffect(() => {
    fetch(`/api/tagihan/${id}`)
      .then((res) => res.json())
      .then((res) => setBill(res.data));
  }, [id]);

  if (!bill) {
    return <div className="animate-pulse p-4">Memuat...</div>;
  }

  const totalTunggakan = bill.amount + (bill.otherUnpaidBills?.reduce((sum, b) => sum + b.amount, 0) || 0);
  const jumlahTagihanBelumBayar = 1 + (bill.otherUnpaidBills?.length || 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/tagihan">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Detail Tagihan</h1>
      </div>

      {/* Warning tunggakan */}
      {bill.status === "belum_bayar" && bill.otherUnpaidBills?.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Pelanggan ini memiliki {jumlahTagihanBelumBayar} tagihan belum dibayar
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Total tunggakan: {formatRupiah(totalTunggakan)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-foreground">
                {bill.billType === "instalasi" ? "Biaya Pemasangan" : "Tagihan Bulanan"}
              </CardTitle>
              <Badge variant={bill.status === "lunas" ? "default" : "destructive"} className={bill.status === "lunas" ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800"}>
                {bill.status === "lunas" ? "Lunas" : "Belum Lunas"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Invoice</p>
              <p className="text-foreground font-mono text-sm">{bill.invoiceNumber}</p>
            </div>

            {bill.billType === "instalasi" ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Jenis Tagihan</p>
                  <p className="text-foreground">Biaya Pemasangan/Instalasi</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paket</p>
                  <p className="text-foreground">{bill.packageName} ({bill.packageSpeed})</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Aktivasi</p>
                  <p className="text-foreground">{bill.activationDate ? formatDate(bill.activationDate) : "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Batas Pembayaran</p>
                  <p className="text-foreground">
                    {bill.activationDate
                      ? formatDate(new Date(
                          Number(bill.activationDate.split("-")[0]),
                          Number(bill.activationDate.split("-")[1]) - 1,
                          Number(bill.activationDate.split("-")[2]) + 3
                        ))
                      : "-"}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Periode Billing</p>
                    <p className="text-foreground">{formatBillingPeriod(bill.billPeriod)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jatuh Tempo</p>
                    <p className="text-foreground">{formatDate(bill.dueDate)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Batas Akhir</p>
                    <p className="text-foreground">{formatDate(getBatasAkhir(bill.dueDate))}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paket</p>
                  <p className="text-foreground">{bill.packageName} ({bill.packageSpeed})</p>
                </div>
              </>
            )}

            <div>
              <p className="text-sm text-muted-foreground">Jumlah Tagihan</p>
              <p className="text-2xl font-bold text-primary">{formatRupiah(bill.amount)}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <a href={`/api/tagihan/${id}/invoice`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="border-border">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </a>
              {bill.status === "belum_bayar" && (
                bill.billType === "instalasi" && !bill.activationDate ? (
                  <Button size="sm" disabled className="opacity-50">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Set tanggal aktivasi dulu
                  </Button>
                ) : (
                  <Link href={`/pembayaran/baru?billId=${bill.id}`}>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Bayar
                    </Button>
                  </Link>
                )
              )}
              {bill.status === "lunas" && bill.payments.length > 0 && (
                <PrintReceiptButton
                  size="sm"
                  receiptData={{
                    appName: "Bill BumdesNET",
                    address: "Desa Jelijih Punggang",
                    transactionCode: bill.payments[0].transactionCode,
                    invoiceNumber: bill.invoiceNumber,
                    paymentDate: bill.payments[0].paymentDate.split("-").reverse().join("-"),
                    paymentTime: (bill.payments[0].paymentTime || "").slice(0, 5),
                    billType: bill.billType,
                    customerName: bill.customerName,
                    customerAddress: bill.customerAddress,
                    packageName: `${bill.packageName} (${bill.packageSpeed})`,
                    period: formatBillingPeriod(bill.billPeriod),
                    amount: bill.amount,
                    paymentMethod: bill.payments[0].paymentMethod,
                    collectorName: bill.payments[0].collectorName,
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Data Pelanggan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Nama</p>
              <p className="font-medium text-foreground">{bill.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Alamat</p>
              <p className="text-foreground">{bill.customerAddress}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Telepon</p>
                <p className="text-foreground">{bill.customerPhone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-foreground">{bill.customerEmail || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tagihan lain yang belum dibayar */}
      {bill.otherUnpaidBills?.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Tagihan Lain Belum Dibayar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bill.otherUnpaidBills.map((unpaid) => (
                <Link key={unpaid.id} href={`/tagihan/${unpaid.id}`}>
                  <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors">
                    <div>
                      <p className="font-medium text-foreground">{unpaid.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        Periode: {formatDate(unpaid.billPeriod)} — Jatuh tempo: {formatDate(unpaid.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatRupiah(unpaid.amount)}</p>
                      <Badge variant="destructive" className="bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800 text-xs">
                        Belum Lunas
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground">Total Seluruh Tunggakan</p>
                <p className="text-lg font-bold text-foreground">{formatRupiah(totalTunggakan)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {bill.payments.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Riwayat Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bill.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{formatRupiah(payment.amountPaid)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(payment.paymentDate)} - {payment.paymentMethod} - oleh {payment.collectorName}
                    </p>
                    {payment.notes && <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

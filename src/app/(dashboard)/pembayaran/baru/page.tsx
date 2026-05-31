"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Upload, Camera, X, ImageIcon, CheckCircle } from "lucide-react";
import Link from "next/link";
import { formatRupiah, formatDate } from "@/lib/utils";
import { PrintReceiptButton } from "@/components/print-receipt-button";

interface Bill {
  id: string;
  customerName: string;
  customerAddress: string;
  packageName: string;
  invoiceNumber: string;
  amount: number;
  billPeriod: string;
  billType: string;
  dueDate: string;
  status: string;
}

export default function CatatPembayaranPage() {
  return (
    <Suspense fallback={<div className="animate-pulse p-4">Memuat...</div>}>
      <CatatPembayaranForm />
    </Suspense>
  );
}

function CatatPembayaranForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedBillId = searchParams.get("billId") || "";
  const [loading, setLoading] = useState(false);
  const [unpaidBills, setUnpaidBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("tunai");
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paidDate, setPaidDate] = useState("");
  const [paidTime, setPaidTime] = useState("");
  const [transactionCode, setTransactionCode] = useState("");

  useEffect(() => {
    fetch("/api/tagihan?status=belum_bayar&limit=100")
      .then((res) => res.json())
      .then((res) => {
        setUnpaidBills(res.data || []);
        if (preselectedBillId) {
          const found = (res.data || []).find((b: Bill) => b.id === preselectedBillId);
          if (found) setSelectedBill(found);
        }
      });
  }, [preselectedBillId]);

  function handleBillChange(billId: string) {
    const found = unpaidBills.find((b) => b.id === billId);
    setSelectedBill(found || null);
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        setProofImageUrl(json.url);
        setPreviewUrl(URL.createObjectURL(file));
        toast.success("Bukti transfer berhasil diupload");
      } else {
        const json = await res.json();
        toast.error(json.error || "Gagal upload file");
      }
    } catch {
      toast.error("Gagal upload file");
    }
    setUploading(false);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }

  function handleRemoveProof() {
    setProofImageUrl("");
    setPreviewUrl("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      billId: formData.get("billId") as string,
      amountPaid: parseInt(formData.get("amountPaid") as string),
      paymentDate: formData.get("paymentDate") as string,
      paymentMethod: formData.get("paymentMethod") as string,
      proofImageUrl: proofImageUrl || undefined,
      notes: formData.get("notes") as string,
    };

    const res = await fetch("/api/pembayaran", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const json = await res.json();
      toast.success("Pembayaran berhasil dicatat");
      setPaidDate(data.paymentDate);
      setPaidTime(json.paymentTime);
      setTransactionCode(json.transactionCode);
      setPaymentSuccess(true);
    } else {
      const err = await res.json();
      toast.error(err.error || "Gagal mencatat pembayaran");
    }
    setLoading(false);
  }

  const today = new Date().toISOString().split("T")[0];

  // Success screen with print option
  if (paymentSuccess && selectedBill) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/pembayaran">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">Pembayaran Berhasil</h1>
        </div>

        <Card className="max-w-lg border-border">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950">
                <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pembayaran Tercatat</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedBill.customerName} — {selectedBill.invoiceNumber}
                </p>
                <p className="text-2xl font-bold text-primary mt-2">{formatRupiah(selectedBill.amount)}</p>
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <PrintReceiptButton
                  receiptData={{
                    appName: "Bill BumdesNET",
                    address: "Desa Jelijih Punggang",
                    transactionCode: transactionCode,
                    invoiceNumber: selectedBill.invoiceNumber,
                    paymentDate: formatDate(paidDate),
                    paymentTime: paidTime,
                    customerName: selectedBill.customerName,
                    customerAddress: selectedBill.customerAddress || "-",
                    packageName: selectedBill.packageName || "-",
                    period: formatDate(selectedBill.billPeriod),
                    amount: selectedBill.amount,
                    paymentMethod: paymentMethod,
                    collectorName: "-",
                  }}
                  className="w-full"
                />
                <Link href="/pembayaran" className="w-full">
                  <Button variant="ghost" className="w-full text-muted-foreground">
                    Kembali ke Pembayaran
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/pembayaran">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Catat Pembayaran</h1>
      </div>

      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {preselectedBillId && selectedBill ? (
              <>
                <input type="hidden" name="billId" value={selectedBill.id} />
                <div className="p-3 bg-accent/50 rounded-lg text-sm border border-border">
                  <p><strong>Pelanggan:</strong> {selectedBill.customerName}</p>
                  <p><strong>Invoice:</strong> {selectedBill.invoiceNumber}</p>
                  <p><strong>Tgl. Jatuh Tempo:</strong> {formatDate(selectedBill.dueDate)}</p>
                  <p><strong>Tagihan:</strong> {formatRupiah(selectedBill.amount)}</p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="billId">Tagihan</Label>
                  <select
                    id="billId"
                    name="billId"
                    required
                    defaultValue={preselectedBillId}
                    onChange={(e) => handleBillChange(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">Pilih tagihan...</option>
                    {unpaidBills.map((bill) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.customerName} - {bill.invoiceNumber} ({formatRupiah(bill.amount)})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBill && (
                  <div className="p-3 bg-accent/50 rounded-lg text-sm border border-border">
                    <p><strong>Pelanggan:</strong> {selectedBill.customerName}</p>
                    <p><strong>Invoice:</strong> {selectedBill.invoiceNumber}</p>
                    <p><strong>Tagihan:</strong> {formatRupiah(selectedBill.amount)}</p>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="amountPaid">Jumlah Bayar (Rp)</Label>
              <Input
                id="amountPaid"
                name="amountPaid"
                type="number"
                value={selectedBill?.amount || ""}
                readOnly
                required
                className="text-lg bg-muted cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Tanggal Bayar</Label>
                <Input
                  id="paymentDate"
                  name="paymentDate"
                  type="date"
                  defaultValue={today}
                  required
                  className="bg-card border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Metode</Label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  required
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  <option value="tunai">Tunai</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
            </div>

            {paymentMethod === "transfer" && (
              <div className="space-y-2">
                <Label>Bukti Transfer</Label>
                {previewUrl ? (
                  <div className="relative">
                    <img src={previewUrl} alt="Bukti transfer" className="w-full max-h-48 object-contain rounded-lg border border-border bg-accent/30" />
                    <button
                      type="button"
                      onClick={handleRemoveProof}
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border bg-card text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>{uploading ? "Mengupload..." : "Pilih File"}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileInput}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border bg-card text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer transition-colors">
                      <Camera className="h-4 w-4" />
                      <span>Kamera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileInput}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">JPG, PNG, atau WebP. Maksimal 5MB.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan (opsional)</Label>
              <Textarea id="notes" name="notes" placeholder="Catatan tambahan..." />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 text-lg">
              {loading ? "Memproses..." : "Konfirmasi Pembayaran"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

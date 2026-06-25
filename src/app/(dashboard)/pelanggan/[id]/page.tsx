"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Pencil, UserX, UserCheck, CalendarPlus, MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatRupiah, formatDate, formatDateTime, customerStatusLabel } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocationPicker } from "@/components/location-picker";
import { LocationMap } from "@/components/location-map";
import { ShareLocationButton } from "@/components/share-location-button";

interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string | null;
  status: string;
  registrationDate: string;
  activationDate: string | null;
  latitude: string | null;
  longitude: string | null;
  packageId: string;
  category: string | null;
  assignedCollectorId: string | null;
  packageName: string;
  packageSpeed: string;
  monthlyPrice: number;
  collectorName: string | null;
  createdAt: string;
  paymentHistory: PaymentRecord[];
}

interface PaymentRecord {
  id: string;
  transactionCode: string;
  amountPaid: number;
  paymentDate: string;
  paymentTime: string | null;
  paymentMethod: string;
  invoiceNumber: string;
  billPeriod: string;
  collectorName: string;
}

interface Package {
  id: string;
  name: string;
  speed: string;
  monthlyPrice: number;
}

interface Collector {
  id: string;
  name: string;
}

export default function DetailPelangganPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const isAdmin = session?.user?.role === "admin";
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateMonths, setGenerateMonths] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [sendWaLoading, setSendWaLoading] = useState<Record<string, boolean>>({});

  async function handleSendReceipt(paymentId: string) {
    setSendWaLoading((prev) => ({ ...prev, [paymentId]: true }));
    try {
      const res = await fetch(`/api/pembayaran/${paymentId}/kirim-wa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Bukti pembayaran berhasil dikirim via WhatsApp");
      } else {
        toast.error(json.error || "Gagal mengirim bukti pembayaran");
      }
    } catch {
      toast.error("Gagal mengirim bukti pembayaran");
    } finally {
      setSendWaLoading((prev) => ({ ...prev, [paymentId]: false }));
    }
  }

  useEffect(() => {
    fetch(`/api/pelanggan/${id}`)
      .then((res) => res.json())
      .then((res) => {
        setCustomer(res.data);
        if (res.data?.latitude) setLatitude(parseFloat(res.data.latitude));
        if (res.data?.longitude) setLongitude(parseFloat(res.data.longitude));
      });
  }, [id]);

  useEffect(() => {
    if (editing) {
      fetch("/api/paket")
        .then((res) => res.json())
        .then((res) => setPackages((res.data || []).filter((p: Package & { isActive: boolean }) => p.isActive)));
      fetch("/api/users?role=collector")
        .then((res) => res.json())
        .then((res) => setCollectors(res.data || []))
        .catch(() => {});
    }
  }, [editing]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      packageId: formData.get("packageId") as string,
      category: formData.get("category") as string,
      registrationDate: formData.get("registrationDate") as string,
      activationDate: formData.get("activationDate") as string,
      latitude,
      longitude,
      assignedCollectorId: formData.get("assignedCollectorId") as string,
    };

    const res = await fetch(`/api/pelanggan/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Pelanggan berhasil diperbarui");
      setEditing(false);
      const updated = await fetch(`/api/pelanggan/${id}`).then((r) => r.json());
      setCustomer(updated.data);
    } else {
      toast.error("Gagal memperbarui pelanggan");
    }
    setLoading(false);
  }

  async function handleToggleStatus() {
    if (!customer) return;
    const nextStatus = customer.status === "aktif" ? "nonaktif" : "aktif";
    const verb = nextStatus === "aktif" ? "Aktifkan" : "Nonaktifkan";
    if (!confirm(`${verb} pelanggan "${customer.name}"?`)) return;
    try {
      const res = await fetch(`/api/pelanggan/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Pelanggan berhasil di${verb.toLowerCase()}`);
        setCustomer((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      } else {
        toast.error(json.error || "Gagal mengubah status");
      }
    } catch {
      toast.error("Gagal mengubah status: koneksi bermasalah");
    }
  }

  async function handleGenerateTagihan() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/pelanggan/${id}/generate-tagihan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: generateMonths }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`${json.generated} tagihan dibuat, ${json.skipped} sudah ada`);
        setGenerateDialogOpen(false);
      } else {
        toast.error(json.error || "Gagal generate tagihan");
      }
    } catch {
      toast.error("Gagal generate tagihan: koneksi bermasalah");
    }
    setGenerating(false);
  }

  if (!customer) {
    return <div className="animate-pulse p-4">Memuat...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/pelanggan">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Detail Pelanggan</h1>
      </div>

      {!editing ? (
        <>
        <Card className="max-w-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{customer.name}</CardTitle>
            <Badge variant={customer.status === "aktif" ? "default" : "secondary"}>
              {customerStatusLabel(customer.status)}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Alamat</p>
              <p className="text-foreground">{customer.address}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Telepon</p>
                <p className="text-foreground">{customer.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-foreground">{customer.email || "-"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Paket</p>
                <p className="text-foreground">{customer.packageName} ({customer.packageSpeed})</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Harga/Bulan</p>
                <p className="font-semibold text-foreground">{formatRupiah(customer.monthlyPrice)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Kategori</p>
                <p className="text-foreground">
                  {customer.category === "wireless_broadband"
                    ? "Wireless Broadband"
                    : customer.category === "fiber_optik"
                    ? "Fiber Optik"
                    : "-"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Registrasi</p>
                <p className="text-foreground">{formatDate(customer.registrationDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Aktivasi</p>
                <p className="text-foreground">{customer.activationDate ? formatDate(customer.activationDate) : "-"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Collector</p>
                <p className="text-foreground">{customer.collectorName || "-"}</p>
              </div>
            </div>
            {customer.latitude && customer.longitude && (
              <div className="space-y-2 pt-2">
                <p className="text-sm text-muted-foreground">Lokasi Pemasangan</p>
                <LocationMap
                  latitude={parseFloat(customer.latitude)}
                  longitude={parseFloat(customer.longitude)}
                />
                <ShareLocationButton
                  customerName={customer.name}
                  address={customer.address}
                  latitude={parseFloat(customer.latitude)}
                  longitude={parseFloat(customer.longitude)}
                  size="sm"
                />
              </div>
            )}
            {isAdmin && (
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <Button onClick={() => setEditing(true)} variant="outline" className="border-border">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={handleToggleStatus}
                  variant="outline"
                  className={customer.status === "aktif" ? "border-border text-destructive hover:text-destructive" : "border-border text-emerald-600 hover:text-emerald-600"}
                >
                  {customer.status === "aktif" ? (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      Nonaktifkan
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Aktifkan
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => { setGenerateMonths(3); setGenerateDialogOpen(true); }}
                  variant="outline"
                  className="border-border"
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Generate Tagihan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={generateDialogOpen} onOpenChange={(open) => !generating && setGenerateDialogOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Tagihan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pelanggan: <span className="text-foreground font-medium">{customer.name}</span>
              </p>
              <div className="space-y-2">
                <label htmlFor="genMonthsDetail" className="text-sm font-medium text-foreground">Jumlah Bulan</label>
                <input
                  id="genMonthsDetail"
                  type="number"
                  min={1}
                  max={12}
                  value={generateMonths}
                  onChange={(e) => setGenerateMonths(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                />
                <p className="text-xs text-muted-foreground">Tagihan yang sudah ada akan dilewati otomatis.</p>
              </div>
              <Button onClick={handleGenerateTagihan} disabled={generating} className="w-full">
                {generating ? "Memproses..." : "Generate"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </>
      ) : (
        <Card className="max-w-lg">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" name="name" defaultValue={customer.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Alamat</Label>
                <Textarea id="address" name="address" defaultValue={customer.address} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon</Label>
                  <Input id="phone" name="phone" defaultValue={customer.phone} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={customer.email || ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="packageId">Paket Internet</Label>
                {packages.length > 0 ? (
                  <select
                    id="packageId"
                    name="packageId"
                    defaultValue={customer.packageId}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} - {pkg.speed}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="h-9 rounded-md border border-input bg-background animate-pulse" />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <select
                  id="category"
                  name="category"
                  defaultValue={customer.category || ""}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Pilih kategori...</option>
                  <option value="wireless_broadband">Wireless Broadband</option>
                  <option value="fiber_optik">Fiber Optik</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationDate">Tanggal Registrasi</Label>
                <Input
                  id="registrationDate"
                  name="registrationDate"
                  type="date"
                  defaultValue={customer.registrationDate}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activationDate">Tanggal Aktivasi</Label>
                <Input
                  id="activationDate"
                  name="activationDate"
                  type="date"
                  defaultValue={customer.activationDate || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedCollectorId">Collector</Label>
                <select
                  id="assignedCollectorId"
                  name="assignedCollectorId"
                  defaultValue={customer.assignedCollectorId || ""}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Pilih collector...</option>
                  {collectors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Lokasi Pemasangan</Label>
                <LocationPicker
                  latitude={latitude}
                  longitude={longitude}
                  onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Riwayat Pembayaran */}
      {!editing && customer.paymentHistory && customer.paymentHistory.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Riwayat Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Kode Transaksi</th>
                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Tanggal</th>
                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Periode</th>
                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">No. Invoice</th>
                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Jumlah</th>
                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Metode</th>
                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.paymentHistory.map((p) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                      <td className="p-3 font-mono text-xs text-primary">{p.transactionCode}</td>
                      <td className="p-3 text-muted-foreground">
                        {formatDateTime(p.paymentDate, p.paymentTime)}
                      </td>
                      <td className="p-3 text-muted-foreground">{formatDate(p.billPeriod)}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{p.invoiceNumber}</td>
                      <td className="p-3 font-medium text-foreground">{formatRupiah(p.amountPaid)}</td>
                      <td className="p-3">
                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">
                          {p.paymentMethod}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {customer.phone && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-green-50 dark:hover:bg-green-950"
                            title="Kirim bukti via WhatsApp"
                            disabled={sendWaLoading[p.id]}
                            onClick={() => handleSendReceipt(p.id)}
                          >
                            {sendWaLoading[p.id] ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                            ) : (
                              <img src="/icons/logo-whatsapp-png-46067.png" alt="WhatsApp" className="h-5 w-5" />
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="md:hidden space-y-3">
              {customer.paymentHistory.map((p) => (
                <div key={p.id} className="p-3 bg-accent/30 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs text-primary">{p.transactionCode}</p>
                      <p className="text-sm font-medium text-foreground mt-1">{p.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(p.paymentDate, p.paymentTime)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{formatRupiah(p.amountPaid)}</p>
                      {customer.phone && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-green-50 dark:hover:bg-green-950"
                          title="Kirim bukti via WhatsApp"
                          disabled={sendWaLoading[p.id]}
                          onClick={() => handleSendReceipt(p.id)}
                        >
                          {sendWaLoading[p.id] ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                          ) : (
                            <img src="/icons/logo-whatsapp-png-46067.png" alt="WhatsApp" className="h-5 w-5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!editing && customer.paymentHistory && customer.paymentHistory.length === 0 && (
        <Card className="border-border">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-sm">Belum ada riwayat pembayaran.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

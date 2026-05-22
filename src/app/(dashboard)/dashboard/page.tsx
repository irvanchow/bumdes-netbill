"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, CheckCircle, AlertCircle, BarChart3, MapPin } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

const CustomersMap = dynamic(() => import("@/components/customers-map"), { ssr: false });
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Stats {
  totalCustomers: number;
  billsThisMonth: { count: number; total: number };
  paidThisMonth: { count: number; total: number };
  unpaidThisMonth: { count: number; total: number };
  revenueByMonth: { period: string; total: number }[];
}

const COLORS = ["#10b981", "#f43f5e"];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Ringkasan aktivitas billing internet</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const pieData = [
    { name: "Lunas", value: stats.paidThisMonth.count },
    { name: "Belum Bayar", value: stats.unpaidThisMonth.count },
  ];

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  // Build full 12-month data, fill missing months with 0
  const revenueMap = new Map<string, number>();
  stats.revenueByMonth.forEach((item) => {
    const date = new Date(item.period);
    revenueMap.set(monthNames[date.getMonth()], item.total);
  });

  const revenueData = monthNames.map((month) => ({
    name: month,
    total: revenueMap.get(month) || 0,
  }));

  const statCards = [
    {
      label: "Pelanggan Aktif",
      value: stats.totalCustomers.toString(),
      sub: "pelanggan terdaftar",
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Tagihan Bulan Ini",
      value: formatRupiah(stats.billsThisMonth.total),
      sub: `${stats.billsThisMonth.count} tagihan`,
      icon: FileText,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
    {
      label: "Sudah Dibayar",
      value: formatRupiah(stats.paidThisMonth.total),
      sub: `${stats.paidThisMonth.count} lunas`,
      icon: CheckCircle,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Belum Dibayar",
      value: formatRupiah(stats.unpaidThisMonth.total),
      sub: `${stats.unpaidThisMonth.count} belum bayar`,
      icon: AlertCircle,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Ringkasan aktivitas billing internet</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-card rounded-xl border border-border p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-semibold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Pendapatan per Bulan</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis
                    fontSize={12}
                    stroke="hsl(var(--muted-foreground))"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`}
                  />
                  <Tooltip
                    formatter={(value) => [formatRupiah(Number(value)), "Pendapatan"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="total" fill="#e78a53" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <BarChart3 className="h-10 w-10 mb-3 stroke-1" />
                <p className="text-sm">Belum ada data pendapatan</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Status Tagihan</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.billsThisMonth.count > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-6 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-sm text-muted-foreground">Lunas ({stats.paidThisMonth.count})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-sm text-muted-foreground">Belum ({stats.unpaidThisMonth.count})</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 stroke-1" />
                <p className="text-sm">Belum ada tagihan bulan ini</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Peta Sebaran Pelanggan */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Peta Sebaran Pelanggan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CustomersMap />
        </CardContent>
      </Card>
    </div>
  );
}

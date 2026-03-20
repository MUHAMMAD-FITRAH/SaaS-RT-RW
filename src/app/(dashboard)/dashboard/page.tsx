"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Home, UserCheck, UserPlus, Wallet, Receipt, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/tenants/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Warga",
      value: stats?.totalWarga ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Warga Aktif",
      value: stats?.wargaAktif ?? 0,
      icon: UserCheck,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Total Rumah",
      value: stats?.totalRumah ?? 0,
      icon: Home,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Total Keluarga",
      value: stats?.totalKeluarga ?? 0,
      icon: UserPlus,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Saldo Kas RT",
      value: formatCurrency(stats?.saldoKas ?? 0),
      icon: Wallet,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      isString: true,
    },
    {
      title: "Iuran Terbayar",
      value: stats?.iuranTerbayar ?? 0,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
      suffix: "bulan ini",
    },
    {
      title: "Tunggakan Iuran",
      value: stats?.iuranTunggakan ?? 0,
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50",
      suffix: "bulan ini",
    },
    {
      title: "Tamu Tercatat",
      value: stats?.totalTamu ?? 0,
      icon: Receipt,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Ringkasan data RT Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">
                    {stat.isString ? stat.value : stat.value.toLocaleString("id-ID")}
                  </p>
                  {stat.suffix && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.suffix}
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-full ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Warga</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aktif</span>
                <span className="font-medium text-green-600">{stats?.wargaAktif ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pindah</span>
                <span className="font-medium text-yellow-600">{stats?.wargaPindah ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Meninggal</span>
                <span className="font-medium text-red-600">{stats?.wargaMeninggal ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hunian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Rumah</span>
                <span className="font-medium">{stats?.totalRumah ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total KK</span>
                <span className="font-medium">{stats?.totalKeluarga ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Keuangan Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saldo Kas</span>
                <span className="font-medium text-emerald-600">
                  {formatCurrency(stats?.saldoKas ?? 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Iuran Lunas</span>
                <span className="font-medium text-green-600">{stats?.iuranTerbayar ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tunggakan</span>
                <span className="font-medium text-red-600">{stats?.iuranTunggakan ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

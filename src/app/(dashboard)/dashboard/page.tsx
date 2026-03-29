"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Home, UserCheck, UserPlus, Wallet, Receipt, TrendingUp, TrendingDown, Server, Building2, FileText, Shield, MessageSquare, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getRoleLabel, getRoleDescription } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import type { DashboardStats } from "@/types";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const role = (session?.user?.role as UserRole) ?? "RESIDENT";

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

  // Role-specific dashboard rendering
  if (role === "SUPER_ADMIN") return <SuperAdminDashboard stats={stats} />;
  if (role === "RW_ADMIN") return <RWAdminDashboard stats={stats} />;
  if (role === "RESIDENT") return <ResidentDashboard stats={stats} userName={session?.user?.name || "Warga"} />;
  return <RTAdminDashboard stats={stats} />;
}

// ==================== SUPER ADMIN DASHBOARD ====================
function SuperAdminDashboard({ stats }: { stats: DashboardStats | null }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">Admin Server Dashboard</h1>
          <Badge variant="destructive">Super Admin</Badge>
        </div>
        <p className="text-muted-foreground">Kelola seluruh platform RT Online</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Warga" value={stats?.totalWarga ?? 0} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Total Rumah" value={stats?.totalRumah ?? 0} icon={Home} color="text-purple-600" bg="bg-purple-50" />
        <StatCard title="Total Keluarga" value={stats?.totalKeluarga ?? 0} icon={UserCheck} color="text-orange-600" bg="bg-orange-50" />
        <StatCard title="Saldo Kas" value={formatCurrency(stats?.saldoKas ?? 0)} icon={Wallet} color="text-emerald-600" bg="bg-emerald-50" isString />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              Platform Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Warga Aktif</span>
                <span className="font-medium text-green-600">{stats?.wargaAktif ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Warga Pindah</span>
                <span className="font-medium text-yellow-600">{stats?.wargaPindah ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Warga Meninggal</span>
                <span className="font-medium text-red-600">{stats?.wargaMeninggal ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tamu Tercatat</span>
                <span className="font-medium">{stats?.totalTamu ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Ringkasan Keuangan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saldo Kas</span>
                <span className="font-medium text-emerald-600">{formatCurrency(stats?.saldoKas ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Iuran Terbayar</span>
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

// ==================== RT ADMIN DASHBOARD ====================
function RTAdminDashboard({ stats }: { stats: DashboardStats | null }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">Dashboard RT</h1>
          <Badge variant="secondary">Admin RT</Badge>
        </div>
        <p className="text-muted-foreground">Ringkasan data & operasional RT Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Warga" value={stats?.totalWarga ?? 0} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Warga Aktif" value={stats?.wargaAktif ?? 0} icon={UserCheck} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Total Rumah" value={stats?.totalRumah ?? 0} icon={Home} color="text-purple-600" bg="bg-purple-50" />
        <StatCard title="Total Keluarga" value={stats?.totalKeluarga ?? 0} icon={UserPlus} color="text-orange-600" bg="bg-orange-50" />
        <StatCard title="Saldo Kas RT" value={formatCurrency(stats?.saldoKas ?? 0)} icon={Wallet} color="text-emerald-600" bg="bg-emerald-50" isString />
        <StatCard title="Iuran Terbayar" value={stats?.iuranTerbayar ?? 0} icon={TrendingUp} color="text-green-600" bg="bg-green-50" suffix="bulan ini" />
        <StatCard title="Tunggakan Iuran" value={stats?.iuranTunggakan ?? 0} icon={TrendingDown} color="text-red-600" bg="bg-red-50" suffix="bulan ini" />
        <StatCard title="Tamu Tercatat" value={stats?.totalTamu ?? 0} icon={Receipt} color="text-indigo-600" bg="bg-indigo-50" />
      </div>

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
                <span className="font-medium text-emerald-600">{formatCurrency(stats?.saldoKas ?? 0)}</span>
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

// ==================== RW ADMIN DASHBOARD ====================
function RWAdminDashboard({ stats }: { stats: DashboardStats | null }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">Dashboard RW / Kelurahan</h1>
          <Badge>Admin RW/Lurah</Badge>
        </div>
        <p className="text-muted-foreground">Pengawasan & monitoring data lintas RT</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Warga" value={stats?.totalWarga ?? 0} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Warga Aktif" value={stats?.wargaAktif ?? 0} icon={UserCheck} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Total Rumah" value={stats?.totalRumah ?? 0} icon={Home} color="text-purple-600" bg="bg-purple-50" />
        <StatCard title="Total Keluarga" value={stats?.totalKeluarga ?? 0} icon={Building2} color="text-orange-600" bg="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Surat Menunggu Persetujuan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">0</p>
            <p className="text-xs text-muted-foreground mt-1">surat perlu ditinjau</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Keluhan Warga
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">0</p>
            <p className="text-xs text-muted-foreground mt-1">keluhan belum ditanggapi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Keamanan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tamu Tercatat</span>
                <span className="font-medium">{stats?.totalTamu ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rekap Keuangan RT</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Saldo Kas</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(stats?.saldoKas ?? 0)}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Iuran Terbayar</p>
              <p className="text-xl font-bold text-green-600">{stats?.iuranTerbayar ?? 0}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Tunggakan</p>
              <p className="text-xl font-bold text-red-600">{stats?.iuranTunggakan ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== RESIDENT DASHBOARD ====================
function ResidentDashboard({ stats, userName }: { stats: DashboardStats | null; userName: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Halo, {userName}!</h1>
        <p className="text-muted-foreground">Selamat datang di portal warga RT Online</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Ajukan Surat</p>
                <p className="text-sm text-muted-foreground">Surat pengantar, keterangan, dll</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-100">
                <Receipt className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium">Cek Iuran</p>
                <p className="text-sm text-muted-foreground">Lihat status pembayaran iuran</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-100">
                <MessageSquare className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Sampaikan Keluhan</p>
                <p className="text-sm text-muted-foreground">Laporkan masalah di lingkungan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Agenda Mendatang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Belum ada agenda mendatang</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Info RT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Warga</span>
                <span className="font-medium">{stats?.totalWarga ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Rumah</span>
                <span className="font-medium">{stats?.totalRumah ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== SHARED STAT CARD ====================
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
  suffix,
  isString,
}: {
  title: string;
  value: number | string;
  icon: typeof Users;
  color: string;
  bg: string;
  suffix?: string;
  isString?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">
              {isString ? value : typeof value === "number" ? value.toLocaleString("id-ID") : value}
            </p>
            {suffix && (
              <p className="text-xs text-muted-foreground mt-1">{suffix}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

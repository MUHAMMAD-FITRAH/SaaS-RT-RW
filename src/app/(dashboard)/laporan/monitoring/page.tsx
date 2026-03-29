"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import { Eye, Users, Home, Wallet, FileText, MessageSquare, Shield, UserCheck } from "lucide-react";

interface MonitoringData {
  totalWarga: number;
  wargaAktif: number;
  totalRumah: number;
  totalKeluarga: number;
  totalTamu: number;
  saldoKas: number;
  iuranTerbayar: number;
  iuranTunggakan: number;
  wargaPindah: number;
  wargaMeninggal: number;
}

export default function MonitoringPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RW_ADMIN, UserRole.SUPER_ADMIN]}>
      <MonitoringContent />
    </RoleGuard>
  );
}

function MonitoringContent() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/tenants/stats")
      .then((res) => res.json())
      .then((result) => { if (result.success) setData(result.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Monitoring RT</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-20 animate-pulse bg-gray-200 rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-red-500">Gagal memuat data.</p>;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">Monitoring RT</h1>
          <Badge>Admin RW/Lurah</Badge>
        </div>
        <p className="text-muted-foreground">Pantau kondisi & aktivitas RT secara real-time</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MonitorCard icon={Users} label="Total Warga" value={data.totalWarga} color="text-blue-600" bg="bg-blue-50" />
        <MonitorCard icon={UserCheck} label="Warga Aktif" value={data.wargaAktif} color="text-green-600" bg="bg-green-50" />
        <MonitorCard icon={Home} label="Total Rumah" value={data.totalRumah} color="text-purple-600" bg="bg-purple-50" />
        <MonitorCard icon={Users} label="Total KK" value={data.totalKeluarga} color="text-orange-600" bg="bg-orange-50" />
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Keuangan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo Kas RT</span>
              <span className="font-medium text-emerald-600">{formatCurrency(data.saldoKas)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Iuran Lunas (bulan ini)</span>
              <span className="font-medium text-green-600">{data.iuranTerbayar}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Iuran Tunggakan</span>
              <span className="font-medium text-red-600">{data.iuranTunggakan}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" /> Status Warga
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Aktif</span>
              <Badge variant="default">{data.wargaAktif}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pindah</span>
              <Badge variant="secondary">{data.wargaPindah}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Meninggal</span>
              <Badge variant="destructive">{data.wargaMeninggal}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Keamanan & Tamu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Tamu Tercatat</span>
              <span className="font-medium">{data.totalTamu}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Akses Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Rekap Warga", href: "/laporan/warga", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Rekap Keuangan", href: "/laporan/keuangan", icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Persetujuan Surat", href: "/laporan/surat", icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Data Warga", href: "/warga", icon: UserCheck, color: "text-purple-600", bg: "bg-purple-50" },
            ].map((item) => (
              <a key={item.href} href={item.href} className={`flex items-center gap-3 p-4 rounded-lg ${item.bg} hover:opacity-80 transition`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MonitorCard({ icon: Icon, label, value, color, bg }: { icon: typeof Users; label: string; value: number; color: string; bg: string }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value.toLocaleString("id-ID")}</p>
        </div>
        <div className={`p-3 rounded-full ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}

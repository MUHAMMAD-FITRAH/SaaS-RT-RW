"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import { Users, Home, UserCheck, TrendingDown, TrendingUp, BarChart3 } from "lucide-react";

interface WargaRekapData {
  totalWarga: number;
  wargaAktif: number;
  wargaPindah: number;
  wargaMeninggal: number;
  totalRumah: number;
  totalKeluarga: number;
  genderStats: { label: string; count: number }[];
  agamaStats: { label: string; count: number }[];
  pekerjaanStats: { label: string; count: number }[];
}

export default function LaporanWargaPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RW_ADMIN, UserRole.SUPER_ADMIN]}>
      <LaporanWargaContent />
    </RoleGuard>
  );
}

function LaporanWargaContent() {
  const [data, setData] = useState<WargaRekapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/laporan/warga")
      .then((res) => res.json())
      .then((result) => { if (result.success) setData(result.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Rekap Data Warga</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
          <h1 className="text-2xl font-bold">Rekap Data Warga</h1>
          <Badge>Admin RW/Lurah</Badge>
        </div>
        <p className="text-muted-foreground">Rekapitulasi data kependudukan lintas RT</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Warga" value={data.totalWarga} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Warga Aktif" value={data.wargaAktif} icon={UserCheck} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Warga Pindah" value={data.wargaPindah} icon={TrendingDown} color="text-yellow-600" bg="bg-yellow-50" />
        <StatCard title="Warga Meninggal" value={data.wargaMeninggal} icon={TrendingUp} color="text-red-600" bg="bg-red-50" />
        <StatCard title="Total Rumah" value={data.totalRumah} icon={Home} color="text-purple-600" bg="bg-purple-50" />
        <StatCard title="Total Keluarga" value={data.totalKeluarga} icon={Users} color="text-orange-600" bg="bg-orange-50" />
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Jenis Kelamin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.genderStats.map((g) => (
                <div key={g.label} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {g.label === "LAKI_LAKI" ? "Laki-laki" : g.label === "PEREMPUAN" ? "Perempuan" : g.label || "N/A"}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${g.label === "LAKI_LAKI" ? "bg-blue-500" : "bg-pink-500"}`}
                        style={{ width: `${(g.count / data.wargaAktif) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{g.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Agama
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.agamaStats.map((a) => (
                <div key={a.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{a.label || "N/A"}</span>
                  <span className="font-medium">{a.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Pekerjaan (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.pekerjaanStats.map((p) => (
                <div key={p.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{p.label}</span>
                  <span className="font-medium">{p.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: { title: string; value: number; icon: typeof Users; color: string; bg: string }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value.toLocaleString("id-ID")}</p>
        </div>
        <div className={`p-3 rounded-full ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}

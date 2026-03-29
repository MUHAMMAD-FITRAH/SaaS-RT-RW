"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown, BarChart3, Receipt, CheckCircle, XCircle } from "lucide-react";

interface KeuanganData {
  tahun: number;
  kas: {
    totalMasuk: number;
    totalKeluar: number;
    saldo: number;
    byCategory: { kategori: string; masuk: number; keluar: number }[];
    recentTransactions: {
      id: string; tanggal: string; jenis: string;
      kategori: string; keterangan: string; jumlah: number;
    }[];
  };
  iuran: {
    monthlyIuran: {
      bulan: number; totalTagihan: number; totalLunas: number;
      totalTunggakan: number; jumlahTerbayar: number; jumlahTunggakan: number;
    }[];
  };
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function LaporanKeuanganPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RW_ADMIN, UserRole.SUPER_ADMIN, UserRole.RT_ADMIN]}>
      <KeuanganContent />
    </RoleGuard>
  );
}

function KeuanganContent() {
  const [data, setData] = useState<KeuanganData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tahun, setTahun] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/laporan/keuangan?tahun=${tahun}`)
      .then((res) => res.json())
      .then((result) => { if (result.success) setData(result.data); })
      .finally(() => setLoading(false));
  }, [tahun]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Rekap Keuangan</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-24 animate-pulse bg-gray-200 rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-red-500">Gagal memuat data.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rekap Keuangan</h1>
          <p className="text-muted-foreground">Laporan kas RT & iuran tahun {tahun}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTahun(tahun - 1)} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">&larr; {tahun - 1}</button>
          <span className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm font-medium">{tahun}</span>
          <button onClick={() => setTahun(tahun + 1)} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">{tahun + 1} &rarr;</button>
        </div>
      </div>

      {/* Kas Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-50"><TrendingUp className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pemasukan</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(data.kas.totalMasuk)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-50"><TrendingDown className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(data.kas.totalKeluar)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-50"><Wallet className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(data.kas.saldo)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kas by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Kas per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.kas.byCategory.map((cat) => (
                <div key={cat.kategori} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{cat.kategori}</span>
                  <div className="flex gap-4">
                    {cat.masuk > 0 && <span className="text-green-600">+{formatCurrency(cat.masuk)}</span>}
                    {cat.keluar > 0 && <span className="text-red-600">-{formatCurrency(cat.keluar)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Transaksi Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.kas.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center text-sm border-b pb-2">
                  <div>
                    <p className="font-medium">{tx.keterangan}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.tanggal).toLocaleDateString("id-ID")} - {tx.kategori}</p>
                  </div>
                  <span className={tx.jenis === "MASUK" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {tx.jenis === "MASUK" ? "+" : "-"}{formatCurrency(tx.jumlah)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Iuran Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Iuran Bulanan {tahun}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Bulan</th>
                  <th className="text-center py-2 px-3 font-medium">Tagihan</th>
                  <th className="text-center py-2 px-3 font-medium">Lunas</th>
                  <th className="text-center py-2 px-3 font-medium">Tunggakan</th>
                  <th className="text-right py-2 px-3 font-medium">Terbayar</th>
                  <th className="text-right py-2 px-3 font-medium">Tunggakan (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {data.iuran.monthlyIuran.map((m) => (
                  <tr key={m.bulan} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3">{BULAN[m.bulan - 1]}</td>
                    <td className="py-2 px-3 text-center">{m.totalTagihan}</td>
                    <td className="py-2 px-3 text-center">
                      {m.totalLunas > 0 ? (
                        <Badge variant="default" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />{m.totalLunas}</Badge>
                      ) : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {m.totalTunggakan > 0 ? (
                        <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />{m.totalTunggakan}</Badge>
                      ) : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="py-2 px-3 text-right text-green-600">{m.jumlahTerbayar > 0 ? formatCurrency(m.jumlahTerbayar) : "-"}</td>
                    <td className="py-2 px-3 text-right text-red-600">{m.jumlahTunggakan > 0 ? formatCurrency(m.jumlahTunggakan) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

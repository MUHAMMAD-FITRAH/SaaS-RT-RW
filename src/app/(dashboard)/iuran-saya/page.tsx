"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import { Receipt, CheckCircle, XCircle, TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface IuranPayment {
  id: string;
  bulan: number;
  tahun: number;
  jumlah: number;
  tanggalBayar: string | null;
  metodeBayar: string | null;
  iuranType: string;
  lunas: boolean;
}

interface IuranData {
  tahun: number;
  summary: {
    totalTagihan: number;
    totalLunas: number;
    totalTunggakan: number;
    totalBayar: number;
    totalHutang: number;
  };
  payments: IuranPayment[];
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function IuranSayaPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RESIDENT]}>
      <IuranContent />
    </RoleGuard>
  );
}

function IuranContent() {
  const [data, setData] = useState<IuranData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tahun, setTahun] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/iuran-saya?tahun=${tahun}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setData(result.data);
      })
      .finally(() => setLoading(false));
  }, [tahun]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Iuran Saya</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-20 animate-pulse bg-gray-200 rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Iuran Saya</h1>
          <p className="text-muted-foreground">Status pembayaran iuran tahun {tahun}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTahun(tahun - 1)} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">&larr; {tahun - 1}</button>
          <span className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm font-medium">{tahun}</span>
          <button onClick={() => setTahun(tahun + 1)} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">{tahun + 1} &rarr;</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-50">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tagihan</p>
              <p className="text-2xl font-bold">{s?.totalTagihan ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-50">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sudah Lunas</p>
              <p className="text-2xl font-bold text-green-600">{s?.totalLunas ?? 0}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(s?.totalBayar ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-50">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tunggakan</p>
              <p className="text-2xl font-bold text-red-600">{s?.totalTunggakan ?? 0}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(s?.totalHutang ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Rincian Pembayaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.payments.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada data iuran untuk tahun {tahun}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Bulan</th>
                    <th className="text-left py-2 px-3 font-medium">Jenis Iuran</th>
                    <th className="text-right py-2 px-3 font-medium">Jumlah</th>
                    <th className="text-center py-2 px-3 font-medium">Status</th>
                    <th className="text-left py-2 px-3 font-medium">Tgl Bayar</th>
                    <th className="text-left py-2 px-3 font-medium">Metode</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">{BULAN[p.bulan - 1]} {p.tahun}</td>
                      <td className="py-2 px-3">{p.iuranType}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(p.jumlah)}</td>
                      <td className="py-2 px-3 text-center">
                        {p.lunas ? (
                          <Badge variant="default" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Lunas</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" /> Belum</Badge>
                        )}
                      </td>
                      <td className="py-2 px-3">{p.tanggalBayar ? new Date(p.tanggalBayar).toLocaleDateString("id-ID") : "-"}</td>
                      <td className="py-2 px-3">{p.metodeBayar || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

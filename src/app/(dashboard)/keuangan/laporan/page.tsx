"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import { BarChart3, TrendingUp, TrendingDown, Wallet, Printer, Receipt, ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KasTx {
  tanggal: string;
  jenis: string;
  kategori: string;
  keterangan: string;
  jumlah: number;
}

interface IuranByType {
  nama: string;
  periode: string;
  totalTagihan: number;
  totalLunas: number;
  jumlahTerkumpul: number;
}

interface MonthlyKas {
  bulan: number;
  masuk: number;
  keluar: number;
}

interface MonthlyIuran {
  bulan: number;
  totalTagihan: number;
  totalLunas: number;
  jumlahTerkumpul: number;
}

interface LaporanData {
  tahun: number;
  kas: {
    totalMasuk: number;
    totalKeluar: number;
    saldo: number;
    byCategory: { kategori: string; masuk: number; keluar: number }[];
    monthlyKas: MonthlyKas[];
    allTransactions: KasTx[];
  };
  iuran: {
    byType: IuranByType[];
    monthly: MonthlyIuran[];
    totalTerkumpul: number;
  };
}

const BULAN_LABEL = [
  "Jan","Feb","Mar","Apr","Mei","Jun",
  "Jul","Agu","Sep","Okt","Nov","Des",
];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

// ─── Mini bar chart (CSS only) ────────────────────────────────────────────────

function MiniBar({ masuk, keluar, maxVal }: { masuk: number; keluar: number; maxVal: number }) {
  const mPct = maxVal > 0 ? Math.round((masuk / maxVal) * 100) : 0;
  const kPct = maxVal > 0 ? Math.round((keluar / maxVal) * 100) : 0;
  return (
    <div className="flex gap-0.5 items-end h-8">
      <div className="w-2 bg-green-400 rounded-t" style={{ height: `${mPct}%`, minHeight: masuk > 0 ? 2 : 0 }} />
      <div className="w-2 bg-red-400 rounded-t" style={{ height: `${kPct}%`, minHeight: keluar > 0 ? 2 : 0 }} />
    </div>
  );
}

// ─── Cashflow Table ───────────────────────────────────────────────────────────

function CashflowTable({ transactions }: { transactions: KasTx[] }) {
  let running = 0;
  const rows = transactions.map((t) => {
    if (t.jenis === "MASUK") running += t.jumlah;
    else running -= t.jumlah;
    return { ...t, saldo: running };
  }).reverse(); // oldest first for running balance

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="py-2.5 px-3 font-medium">Tanggal</th>
            <th className="py-2.5 px-3 font-medium">Kategori</th>
            <th className="py-2.5 px-3 font-medium hidden md:table-cell">Keterangan</th>
            <th className="py-2.5 px-3 font-medium text-right text-green-700">Masuk</th>
            <th className="py-2.5 px-3 font-medium text-right text-red-700">Keluar</th>
            <th className="py-2.5 px-3 font-medium text-right">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={i} className="border-b hover:bg-gray-50">
              <td className="py-2 px-3 text-xs whitespace-nowrap">
                {new Date(t.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
              </td>
              <td className="py-2 px-3 text-xs">{t.kategori}</td>
              <td className="py-2 px-3 text-xs text-muted-foreground hidden md:table-cell">{t.keterangan}</td>
              <td className="py-2 px-3 text-right text-green-600 text-xs font-medium">
                {t.jenis === "MASUK" ? formatCurrency(t.jumlah) : ""}
              </td>
              <td className="py-2 px-3 text-right text-red-600 text-xs font-medium">
                {t.jenis === "KELUAR" ? formatCurrency(t.jumlah) : ""}
              </td>
              <td className={`py-2 px-3 text-right text-xs font-semibold ${t.saldo >= 0 ? "text-blue-700" : "text-red-700"}`}>
                {formatCurrency(t.saldo)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function KeuanganLaporanPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RT_ADMIN, UserRole.RW_ADMIN]}>
      <LaporanContent />
    </RoleGuard>
  );
}

function LaporanContent() {
  const [data, setData] = useState<LaporanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [showCashflow, setShowCashflow] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/keuangan/transparansi?tahun=${tahun}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }, [tahun]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <Card key={i}><CardContent className="p-6"><div className="h-16 animate-pulse bg-gray-100 rounded" /></CardContent></Card>)}
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-red-500">Gagal memuat laporan.</p>;

  const kas = data.kas;
  const iuran = data.iuran;
  const maxMonthly = Math.max(...kas.monthlyKas.map((m) => Math.max(m.masuk, m.keluar)), 1);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11px; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Laporan Keuangan
          </h1>
          <p className="text-sm text-muted-foreground">Ringkasan kas & iuran RT</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={String(tahun)} onChange={(e) => setTahun(parseInt(e.target.value))} className="w-20">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Cetak
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h2 className="text-xl font-bold">LAPORAN KEUANGAN RT</h2>
        <p className="text-sm">Tahun {tahun} · Dicetak {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Pemasukan Kas</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(kas.totalMasuk)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Pengeluaran Kas</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(kas.totalKeluar)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Saldo Kas</p>
                <p className={`text-xl font-bold ${kas.saldo >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  {formatCurrency(kas.saldo)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Arus Kas per Bulan — {tahun}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-32">
              {kas.monthlyKas.map((m) => (
                <div key={m.bulan} className="flex-1 flex flex-col items-center gap-1">
                  <MiniBar masuk={m.masuk} keluar={m.keluar} maxVal={maxMonthly} />
                  <span className="text-[9px] text-muted-foreground">{BULAN_LABEL[m.bulan - 1]}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-400 inline-block" /> Masuk</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" /> Keluar</span>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {kas.byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data</p>
            ) : (
              <div className="space-y-2">
                {kas.byCategory
                  .sort((a, b) => (b.masuk + b.keluar) - (a.masuk + a.keluar))
                  .map((c) => (
                    <div key={c.kategori} className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate mr-2">{c.kategori}</span>
                      <div className="flex gap-3 shrink-0">
                        {c.masuk > 0 && <span className="text-green-600 text-xs">+{formatCurrency(c.masuk)}</span>}
                        {c.keluar > 0 && <span className="text-red-600 text-xs">-{formatCurrency(c.keluar)}</span>}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Iuran Collection */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <CardTitle className="text-base">Rekapitulasi Iuran — {tahun}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {iuran.byType.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data iuran</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-2 font-medium">Jenis Iuran</th>
                    <th className="py-2 px-2 font-medium">Periode</th>
                    <th className="py-2 px-2 font-medium text-right">Tagihan</th>
                    <th className="py-2 px-2 font-medium text-right">Lunas</th>
                    <th className="py-2 px-2 font-medium text-right">Terkumpul</th>
                    <th className="py-2 px-2 font-medium text-right">Kepatuhan</th>
                  </tr>
                </thead>
                <tbody>
                  {iuran.byType.map((t) => (
                    <tr key={t.nama} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium">{t.nama}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs">{t.periode}</Badge>
                      </td>
                      <td className="py-2 px-2 text-right">{t.totalTagihan}</td>
                      <td className="py-2 px-2 text-right text-green-600">{t.totalLunas}</td>
                      <td className="py-2 px-2 text-right font-medium">{formatCurrency(t.jumlahTerkumpul)}</td>
                      <td className="py-2 px-2 text-right">
                        <span className={`text-xs font-semibold ${
                          t.totalTagihan > 0 && (t.totalLunas / t.totalTagihan) >= 0.8 ? "text-green-600" : "text-yellow-600"
                        }`}>
                          {t.totalTagihan > 0 ? Math.round((t.totalLunas / t.totalTagihan) * 100) : 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 bg-gray-50 font-semibold">
                    <td colSpan={4} className="py-2 px-2">Total Iuran Terkumpul</td>
                    <td className="py-2 px-2 text-right text-green-700">{formatCurrency(iuran.totalTerkumpul)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Iuran */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Koleksi Iuran per Bulan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-2 font-medium">Bulan</th>
                  <th className="py-2 px-2 font-medium text-right">Tagihan</th>
                  <th className="py-2 px-2 font-medium text-right">Lunas</th>
                  <th className="py-2 px-2 font-medium text-right">Terkumpul</th>
                  <th className="py-2 px-2 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {iuran.monthly
                  .filter((m) => m.totalTagihan > 0)
                  .map((m) => (
                    <tr key={m.bulan} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2">{BULAN_LABEL[m.bulan - 1]} {tahun}</td>
                      <td className="py-2 px-2 text-right">{m.totalTagihan}</td>
                      <td className="py-2 px-2 text-right text-green-600">{m.totalLunas}</td>
                      <td className="py-2 px-2 text-right font-medium">{formatCurrency(m.jumlahTerkumpul)}</td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${Math.round((m.totalLunas / m.totalTagihan) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs">{Math.round((m.totalLunas / m.totalTagihan) * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cashflow detail */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Detail Cashflow Kas</CardTitle>
            <Button variant="ghost" size="sm" className="no-print" onClick={() => setShowCashflow(!showCashflow)}>
              {showCashflow ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {showCashflow ? "Sembunyikan" : "Tampilkan"}
            </Button>
          </div>
        </CardHeader>
        {(showCashflow || true) && (
          <CardContent className={showCashflow ? "" : "hidden print:block"}>
            {(kas.allTransactions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
            ) : (
              <CashflowTable transactions={kas.allTransactions} />
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

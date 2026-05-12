"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Home, UserCheck, UserPlus, Wallet, Receipt,
  TrendingUp, TrendingDown, Server, Building2, FileText,
  Shield, MessageSquare, Calendar, AlertTriangle,
  ChevronRight, ArrowUpRight, ArrowDownRight, MapPin, Clock, X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getRoleLabel, getRoleDescription } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import type { DashboardStats } from "@/types";

// ─── Month labels ─────────────────────────────────────────────────────────────
const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

// ─── Types for resident API ───────────────────────────────────────────────────
interface ResidentData {
  myIuran: { status: string; jumlah: number; bulan: number; tahun: number; nama: string } | null;
  keluhanAktif: number;
  agendaMingguIni: number;
  iuranProgress: { pct: number; totalTerkumpul: number; totalTarget: number; totalLunas: number; totalTagihan: number; bulan: number; tahun: number };
  monthlyKas: { bulan: number; tahun: number; label: string; masuk: number; keluar: number }[];
  recentKas: { id: string; tanggal: string; jenis: string; kategori: string; keterangan: string; jumlah: number }[];
  upcomingAgenda: { id: string; judul: string; tanggalMulai: string; lokasi: string | null }[];
  rtInfo: { totalWarga: number; totalRumah: number };
}

// ─── Compact number format ────────────────────────────────────────────────────
function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}jt`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}rb`;
  return `${n}`;
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
function LineChart({ data }: { data: { label: string; masuk: number; keluar: number }[] }) {
  const W = 280, H = 120, padL = 36, padB = 20, padT = 10, padR = 8;
  const chartW = W - padL - padR;
  const chartH = H - padB - padT;

  const allVals = data.flatMap((d) => [d.masuk, d.keluar]);
  const maxVal  = Math.max(...allVals, 1);

  // Nice Y axis: 4 ticks
  const tickCount = 4;
  const rawStep   = maxVal / (tickCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step      = Math.ceil(rawStep / magnitude) * magnitude;
  const yMax      = step * (tickCount - 1);
  const ticks     = Array.from({ length: tickCount }, (_, i) => i * step);

  const xOf = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const yOf = (v: number) => padT + chartH - (v / yMax) * chartH;

  function smoothPath(pts: [number, number][]) {
    if (pts.length === 0) return "";
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cx       = (x0 + x1) / 2;
      d += ` C ${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
    }
    return d;
  }

  const masukPts:  [number, number][] = data.map((d, i) => [xOf(i), yOf(d.masuk)]);
  const keluarPts: [number, number][] = data.map((d, i) => [xOf(i), yOf(d.keluar)]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[120px]">
      {/* Y-axis grid + labels */}
      {ticks.map((v) => {
        const y = yOf(v);
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f0f0f0" strokeWidth="1" />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize="7" fill="#aaa">
              {fmtCompact(v)}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text key={i} x={xOf(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="#aaa">
          {d.label}
        </text>
      ))}

      {/* Area fills */}
      {data.length > 1 && (
        <>
          <path
            d={`${smoothPath(masukPts)} L ${masukPts[masukPts.length - 1][0]} ${padT + chartH} L ${padL} ${padT + chartH} Z`}
            fill="#22c55e" fillOpacity="0.08"
          />
          <path
            d={`${smoothPath(keluarPts)} L ${keluarPts[keluarPts.length - 1][0]} ${padT + chartH} L ${padL} ${padT + chartH} Z`}
            fill="#ef4444" fillOpacity="0.08"
          />
          {/* Lines */}
          <path d={smoothPath(masukPts)} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
          <path d={smoothPath(keluarPts)} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        </>
      )}

      {/* Dots */}
      {masukPts.map(([x, y], i) => (
        <circle key={`m${i}`} cx={x} cy={y} r="3" fill="#22c55e" />
      ))}
      {keluarPts.map(([x, y], i) => (
        <circle key={`k${i}`} cx={x} cy={y} r="3" fill="#ef4444" />
      ))}
    </svg>
  );
}

// ─── Agenda Mini Detail Modal ─────────────────────────────────────────────────
const MONTHS_FULL = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function fmtDateFull(s: string) {
  const d = new Date(s);
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtTimeFull(s: string) {
  return new Date(s).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

interface AgendaFull {
  id: string; judul: string; deskripsi: string | null;
  tanggalMulai: string; tanggalSelesai: string | null; lokasi: string | null;
  foto: string[]; isPublished: boolean;
}

function AgendaMiniDetail({ agenda, onClose }: { agenda: AgendaFull; onClose: () => void }) {
  const tgl = new Date(agenda.tanggalMulai);
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-indigo-600 text-white px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-indigo-200 uppercase tracking-wide mb-1">Agenda Mendatang</p>
              <h2 className="text-lg font-bold leading-snug">{agenda.judul}</h2>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white shrink-0 mt-1">
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Date strip */}
          <div className="mt-4 flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div className="text-sm">
              <p className="font-semibold">{fmtDateFull(agenda.tanggalMulai)}</p>
              {agenda.tanggalSelesai && (
                <p className="text-white/70 text-xs">s/d {fmtDateFull(agenda.tanggalSelesai)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Time */}
          <div className="flex items-center gap-3 py-3 border-b">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Waktu Mulai</p>
              <p className="text-sm font-semibold text-gray-800">
                {tgl.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          {/* Location */}
          {agenda.lokasi && (
            <div className="flex items-center gap-3 py-3 border-b">
              <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Lokasi</p>
                <p className="text-sm font-semibold text-gray-800">{agenda.lokasi}</p>
              </div>
            </div>
          )}
          {/* Description */}
          {agenda.deskripsi ? (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Deskripsi</p>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3">{agenda.deskripsi}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-6">Tidak ada deskripsi</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <Link
            href="/agenda"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors"
            onClick={onClose}
          >
            Lihat semua agenda <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}

// ─── Ring Progress ────────────────────────────────────────────────────────────
function RingProgress({ pct, size = 96 }: { pct: number; size?: number }) {
  const r  = (size - 14) / 2;
  const c  = 2 * Math.PI * r;
  const progress = Math.min(pct, 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#6366f1" strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${(progress / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#111">
        {progress}%
      </text>
    </svg>
  );
}

// ─── Date box for agenda ──────────────────────────────────────────────────────
function DateBox({ date }: { date: Date }) {
  return (
    <div className="flex flex-col items-center justify-center w-10 h-12 rounded-xl bg-indigo-50 shrink-0">
      <span className="text-[10px] font-semibold text-indigo-400 uppercase leading-none">
        {MONTHS_ID[date.getMonth()]}
      </span>
      <span className="text-lg font-bold text-indigo-700 leading-tight">{date.getDate()}</span>
    </div>
  );
}

// ─── House illustration SVG ───────────────────────────────────────────────────
function HouseIllustration() {
  return (
    <svg viewBox="0 0 80 70" className="w-20 h-[70px] opacity-80" fill="none">
      <rect x="15" y="35" width="50" height="30" rx="2" fill="#c7d2fe" />
      <polygon points="10,35 40,10 70,35" fill="#818cf8" />
      <rect x="30" y="45" width="20" height="20" rx="2" fill="#6366f1" />
      <rect x="18" y="42" width="12" height="10" rx="1" fill="#fff" fillOpacity="0.7" />
      <rect x="50" y="42" width="12" height="10" rx="1" fill="#fff" fillOpacity="0.7" />
      <rect x="38" y="10" width="8" height="8" rx="1" fill="#c7d2fe" />
    </svg>
  );
}

// ============================================================
export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const role = (session?.user?.role as UserRole) ?? "RESIDENT";

  useEffect(() => {
    fetch("/api/v1/tenants/stats")
      .then((res) => res.json())
      .then((data) => { if (data.success) setStats(data.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse bg-gray-100 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => <div key={i} className="h-24 animate-pulse bg-gray-100 rounded-2xl" />)}
        </div>
        <div className="h-48 animate-pulse bg-gray-100 rounded-2xl" />
        <div className="h-48 animate-pulse bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (role === "SUPER_ADMIN") return <SuperAdminDashboard stats={stats} />;
  if (role === "RW_ADMIN")    return <RWAdminDashboard stats={stats} />;
  if (role === "RESIDENT")    return <ResidentDashboard userName={session?.user?.name || "Warga"} />;
  return <RTAdminDashboard stats={stats} />;
}

// ==================== RESIDENT DASHBOARD ====================
function ResidentDashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<ResidentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgenda, setSelectedAgenda] = useState<AgendaFull | null>(null);

  useEffect(() => {
    fetch("/api/v1/dashboard/resident")
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .finally(() => setLoading(false));
  }, []);

  async function openAgenda(id: string) {
    const res = await fetch(`/api/v1/agenda/${id}`);
    const json = await res.json();
    if (json.success) setSelectedAgenda(json.data);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse bg-gray-100 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => <div key={i} className="h-24 animate-pulse bg-gray-100 rounded-2xl" />)}
        </div>
        <div className="h-48 animate-pulse bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  const iuranStatus  = data?.myIuran?.status ?? "BELUM_BAYAR";
  const iuranBelum   = iuranStatus === "BELUM_BAYAR";
  const keluhanAktif = data?.keluhanAktif ?? 0;
  const agendaCount  = data?.agendaMingguIni ?? 0;
  const now          = new Date();
  const progress     = data?.iuranProgress ?? { pct: 0, totalTerkumpul: 0, totalTarget: 0, totalLunas: 0, totalTagihan: 0, bulan: now.getMonth() + 1, tahun: now.getFullYear() };
  const monthlyKas   = data?.monthlyKas ?? [];
  const recentKas    = data?.recentKas ?? [];
  const upcoming     = data?.upcomingAgenda ?? [];
  const rtInfo       = data?.rtInfo ?? { totalWarga: 0, totalRumah: 0 };

  return (
    <div className="space-y-4 max-w-2xl mx-auto lg:max-w-none">

      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl px-5 py-4 text-white">
        <p className="text-sm opacity-80">Selamat datang di portal warga</p>
        <h1 className="text-xl font-bold mt-0.5">Halo, {userName}! 👋</h1>
        <p className="text-xs opacity-70 mt-1">RT Online • {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {/* ── 3 Quick Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Iuran */}
        <Link href="/iuran-saya" className="bg-white rounded-2xl p-3 shadow-sm border hover:shadow-md transition-shadow">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${iuranBelum ? "bg-red-50" : "bg-green-50"}`}>
            <Receipt className={`h-4 w-4 ${iuranBelum ? "text-red-500" : "text-green-500"}`} />
          </div>
          <p className="text-[10px] text-gray-500 leading-none">Iuran Bulan Ini</p>
          <p className={`text-xs font-bold mt-1 leading-tight ${iuranBelum ? "text-red-500" : "text-green-600"}`}>
            {iuranBelum ? "Belum bayar" : "Lunas"}
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5">
            {MONTHS_ID[(data?.myIuran?.bulan ?? new Date().getMonth() + 1) - 1]} {data?.myIuran?.tahun ?? new Date().getFullYear()}
          </p>
        </Link>

        {/* Keluhan */}
        <Link href="/keluhan" className="bg-white rounded-2xl p-3 shadow-sm border hover:shadow-md transition-shadow">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2 bg-orange-50">
            <MessageSquare className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-[10px] text-gray-500 leading-none">Keluhan Aktif</p>
          <p className="text-xl font-bold text-gray-800 mt-1 leading-tight">{keluhanAktif}</p>
          <p className="text-[9px] text-gray-400 mt-0.5">laporan</p>
        </Link>

        {/* Agenda */}
        <Link href="/agenda" className="bg-white rounded-2xl p-3 shadow-sm border hover:shadow-md transition-shadow">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2 bg-blue-50">
            <Calendar className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-[10px] text-gray-500 leading-none">Agenda Aktif</p>
          <p className="text-xl font-bold text-gray-800 mt-1 leading-tight">{agendaCount}</p>
          <p className="text-[9px] text-gray-400 mt-0.5">event</p>
        </Link>
      </div>

      {/* ── Alert Banner ──────────────────────────────────────────────────── */}
      {iuranBelum && (
        <Link href="/iuran-saya" className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 hover:bg-red-100 transition-colors">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">
            Anda memiliki tunggakan iuran bulan{" "}
            <span className="font-semibold">
              {MONTHS_ID[(data?.myIuran?.bulan ?? new Date().getMonth() + 1) - 1]} {data?.myIuran?.tahun ?? new Date().getFullYear()}
            </span>
          </p>
          <span className="text-xs font-semibold text-red-600 shrink-0 flex items-center gap-0.5">
            Bayar <ChevronRight className="h-3 w-3" />
          </span>
        </Link>
      )}

      {/* ── Charts Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ring progress - iuran RT */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border">
          <p className="text-sm font-semibold text-gray-800">
            Progress Iuran {MONTHS_ID[(progress.bulan ?? new Date().getMonth() + 1) - 1]} {progress.tahun ?? new Date().getFullYear()}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <RingProgress pct={progress.pct} size={96} />
            <div className="space-y-2 flex-1">
              <div>
                <p className="text-xs text-gray-500">Terkumpul</p>
                <p className="text-base font-bold text-gray-800">{formatCurrency(progress.totalTerkumpul)}</p>
                <p className="text-[10px] text-gray-400">dari {formatCurrency(progress.totalTarget)}</p>
              </div>
              <div className="flex gap-3 text-xs">
                <div>
                  <span className="text-green-600 font-semibold">{progress.totalLunas}</span>
                  <span className="text-gray-400"> lunas</span>
                </div>
                <div>
                  <span className="text-red-500 font-semibold">{progress.totalTagihan - progress.totalLunas}</span>
                  <span className="text-gray-400"> belum</span>
                </div>
              </div>
            </div>
          </div>
          <Link href="/keuangan/transparansi" className="flex items-center gap-1 text-xs text-indigo-600 font-medium mt-3 hover:underline">
            Lihat detail iuran <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Line chart — kas 3 months */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">Grafik Kas RT</p>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">3 Bulan Terakhir</span>
          </div>
          {monthlyKas.length > 0 ? (
            <LineChart data={monthlyKas} />
          ) : (
            <div className="h-[120px] flex items-center justify-center text-xs text-gray-400">Belum ada data kas</div>
          )}
          {/* Legend */}
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className="w-4 h-0.5 bg-green-500 rounded-full inline-block" />
              Pemasukan
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className="w-4 h-0.5 bg-red-500 rounded-full inline-block" />
              Pengeluaran
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/surat-saya" className="bg-white rounded-2xl p-4 shadow-sm border hover:shadow-md transition-shadow flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <FileText className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">Ajukan Surat</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Surat pengantar & keterangan</p>
          </div>
          <ChevronRight className="h-3 w-3 text-gray-300" />
        </Link>

        <Link href="/iuran-saya" className="bg-white rounded-2xl p-4 shadow-sm border hover:shadow-md transition-shadow flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">Bayar Iuran</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Iuran bulanan RT</p>
          </div>
          <ChevronRight className="h-3 w-3 text-gray-300" />
        </Link>

        <Link href="/keluhan" className="bg-white rounded-2xl p-4 shadow-sm border hover:shadow-md transition-shadow flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">Lapor Cepat</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Sampaikan keluhan</p>
          </div>
          <ChevronRight className="h-3 w-3 text-gray-300" />
        </Link>
      </div>

      {/* ── Aktivitas + Agenda row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Aktivitas Terbaru */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">Aktivitas Terbaru</p>
            <Link href="/keuangan/transparansi" className="text-[10px] text-indigo-600 hover:underline">Lihat semua</Link>
          </div>
          {recentKas.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Belum ada aktivitas</p>
          ) : (
            <div className="space-y-3">
              {recentKas.map((tx) => {
                const isMasuk = tx.jenis === "MASUK";
                const tgl = new Date(tx.tanggal);
                return (
                  <div key={tx.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isMasuk ? "bg-green-50" : "bg-red-50"}`}>
                      {isMasuk
                        ? <ArrowUpRight className="h-4 w-4 text-green-600" />
                        : <ArrowDownRight className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{tx.keterangan}</p>
                      <p className="text-[10px] text-gray-400">
                        {tgl.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <p className={`text-xs font-semibold shrink-0 ${isMasuk ? "text-green-600" : "text-red-500"}`}>
                      {isMasuk ? "+" : "-"}{formatCurrency(tx.jumlah)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Agenda Mendatang */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">Agenda Mendatang</p>
            <Link href="/agenda" className="text-[10px] text-indigo-600 hover:underline">Lihat semua</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Tidak ada agenda mendatang</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((ag) => {
                const tgl = new Date(ag.tanggalMulai);
                return (
                  <button
                    key={ag.id}
                    onClick={() => openAgenda(ag.id)}
                    className="w-full text-left flex items-start gap-3 p-2 rounded-xl hover:bg-indigo-50 transition-colors"
                  >
                    <DateBox date={tgl} />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">{ag.judul}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {tgl.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {ag.lokasi && (
                        <span className="inline-block mt-1 text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full truncate max-w-full">
                          {ag.lokasi}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0 mt-3" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Info RT Card ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-indigo-600" />
            <p className="text-sm font-semibold text-indigo-800">Info RT</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/70 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-500">Total Warga</p>
              <p className="text-2xl font-bold text-indigo-700">{rtInfo.totalWarga}</p>
            </div>
            <div className="bg-white/70 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-500">Total Rumah</p>
              <p className="text-2xl font-bold text-indigo-700">{rtInfo.totalRumah}</p>
            </div>
          </div>
        </div>
        <HouseIllustration />
      </div>

      {/* ── Agenda detail modal ───────────────────────────────────────────── */}
      {selectedAgenda && (
        <AgendaMiniDetail
          agenda={selectedAgenda}
          onClose={() => setSelectedAgenda(null)}
        />
      )}

    </div>
  );
}

// ==================== SUPER ADMIN DASHBOARD ====================
function SuperAdminDashboard({ stats }: { stats: DashboardStats | null }) {
  const tierBreakdown = stats?.tierBreakdown ?? {};
  const recentTenants = stats?.recentTenants ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">Admin Server Dashboard</h1>
          <Badge variant="destructive">Super Admin</Badge>
        </div>
        <p className="text-muted-foreground">Full Control — Kelola seluruh platform RT Online (Plan A, B, C)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tenant RT" value={stats?.totalTenants ?? 0} icon={Building2} color="text-indigo-600" bg="bg-indigo-50" />
        <StatCard title="Tenant Aktif" value={stats?.activeTenants ?? 0} icon={Server} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={UserCheck} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Total Warga" value={stats?.totalWarga ?? 0} icon={Users} color="text-purple-600" bg="bg-purple-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Warga Aktif" value={stats?.wargaAktif ?? 0} icon={UserCheck} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Total Rumah" value={stats?.totalRumah ?? 0} icon={Home} color="text-orange-600" bg="bg-orange-50" />
        <StatCard title="Total Keluarga" value={stats?.totalKeluarga ?? 0} icon={UserPlus} color="text-pink-600" bg="bg-pink-50" />
        <StatCard title="Saldo Kas (All)" value={formatCurrency(stats?.saldoKas ?? 0)} icon={Wallet} color="text-emerald-600" bg="bg-emerald-50" isString />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Subscription Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Plan A (Basic)</span>
                <Badge variant="outline">{tierBreakdown.TIER_A ?? 0} tenant</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Plan B (Standard)</span>
                <Badge variant="secondary">{tierBreakdown.TIER_B ?? 0} tenant</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Plan C (Premium)</span>
                <Badge>{tierBreakdown.TIER_C ?? 0} tenant</Badge>
              </div>
              <div className="pt-2 border-t flex justify-between text-sm font-medium">
                <span>Total</span>
                <span>{stats?.totalTenants ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <FileText className="h-4 w-4" />
              Surat & Keluhan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Surat</span>
                <span className="font-medium">{stats?.totalSurat ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Surat Pending</span>
                <span className="font-medium text-amber-600">{stats?.suratPending ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Keluhan</span>
                <span className="font-medium">{stats?.totalKeluhan ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Keluhan Pending</span>
                <span className="font-medium text-red-600">{stats?.keluhanPending ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Keuangan Seluruh Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs text-muted-foreground">Saldo Kas</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats?.saldoKas ?? 0)}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-muted-foreground">Iuran Lunas</p>
                <p className="text-lg font-bold text-green-600">{stats?.iuranTerbayar ?? 0}</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-muted-foreground">Tunggakan</p>
                <p className="text-lg font-bold text-red-600">{stats?.iuranTunggakan ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Tenant Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTenants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada tenant</p>
            ) : (
              <div className="space-y-3">
                {recentTenants.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">RT {t.rtNumber}/RW {t.rwNumber} • {t.wargaCount} warga</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={t.tier === "TIER_C" ? "default" : t.tier === "TIER_B" ? "secondary" : "outline"} className="text-xs">
                        {t.tier === "TIER_A" ? "Plan A" : t.tier === "TIER_B" ? "Plan B" : t.tier === "TIER_C" ? "Plan C" : "—"}
                      </Badge>
                      <span className={`w-2 h-2 rounded-full ${t.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
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
          <CardHeader><CardTitle className="text-base">Status Warga</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Aktif</span><span className="font-medium text-green-600">{stats?.wargaAktif ?? 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pindah</span><span className="font-medium text-yellow-600">{stats?.wargaPindah ?? 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Meninggal</span><span className="font-medium text-red-600">{stats?.wargaMeninggal ?? 0}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Hunian</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Rumah</span><span className="font-medium">{stats?.totalRumah ?? 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total KK</span><span className="font-medium">{stats?.totalKeluarga ?? 0}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Keuangan Bulan Ini</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Saldo Kas</span><span className="font-medium text-emerald-600">{formatCurrency(stats?.saldoKas ?? 0)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Iuran Lunas</span><span className="font-medium text-green-600">{stats?.iuranTerbayar ?? 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tunggakan</span><span className="font-medium text-red-600">{stats?.iuranTunggakan ?? 0}</span></div>
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
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Surat Menunggu Persetujuan</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">0</p>
            <p className="text-xs text-muted-foreground mt-1">surat perlu ditinjau</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" />Keluhan Warga</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">0</p>
            <p className="text-xs text-muted-foreground mt-1">keluhan belum ditanggapi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Keamanan</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tamu Tercatat</span><span className="font-medium">{stats?.totalTamu ?? 0}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Rekap Keuangan RT</CardTitle></CardHeader>
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

// ==================== SHARED STAT CARD ====================
function StatCard({
  title, value, icon: Icon, color, bg, suffix, isString,
}: {
  title: string; value: number | string; icon: typeof Users;
  color: string; bg: string; suffix?: string; isString?: boolean;
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
            {suffix && <p className="text-xs text-muted-foreground mt-1">{suffix}</p>}
          </div>
          <div className={`p-3 rounded-full ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

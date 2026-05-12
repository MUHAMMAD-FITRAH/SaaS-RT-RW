"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Eye, TrendingUp, TrendingDown, Wallet,
  ArrowRight, ArrowLeft, Download, Upload,
  ChevronDown, X, CheckCircle2, AlertCircle,
  Clock, CalendarDays, Tag, Banknote, Info,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KasTx {
  id:         string;
  tanggal:    string;
  jenis:      string;
  kategori:   string;
  keterangan: string;
  jumlah:     number;
}

interface IuranByType {
  nama:            string;
  periode:         string;
  deskripsi:       string | null;
  targetJumlah:    number;
  totalTagihan:    number;
  totalLunas:      number;
  jumlahTerkumpul: number;
}

interface TransparansiData {
  tahun: number;
  kas: {
    totalMasuk:      number;
    totalKeluar:     number;
    saldo:           number;
    byCategory:      { kategori: string; masuk: number; keluar: number; count: number }[];
    monthlyKas:      { bulan: number; masuk: number; keluar: number }[];
    allTransactions: KasTx[];
  };
  iuran: {
    byType:          IuranByType[];
    monthly:         { bulan: number; totalTagihan: number; totalLunas: number; jumlahTerkumpul: number }[];
    totalTerkumpul:  number;
  };
}

// ─── Panel view union ─────────────────────────────────────────────────────────

type ListView =
  | { kind: "tx-list";      filter: "masuk" | "keluar" | "all"; title: string }
  | { kind: "tx-kategori";  kategori: string; color: string }
  | { kind: "tx-bulan";     bulan: number; tahun: number }

type PanelView =
  | ListView
  | { kind: "tx-detail";    tx: KasTx; from?: ListView }
  | { kind: "iuran-detail"; t: IuranByType }

// ─── Constants ────────────────────────────────────────────────────────────────

const BULAN_LABEL = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const BULAN_FULL  = ["Januari","Februari","Maret","April","Mei","Juni",
                     "Juli","Agustus","September","Oktober","November","Desember"];

const CAT_COLORS = [
  "#3b82f6","#22c55e","#f59e0b","#ef4444","#a855f7",
  "#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "jt";
  if (n >= 1_000)     return Math.round(n / 1_000) + "rb";
  return String(n);
}

function fmtDate(s: string | Date, long = false) {
  return new Date(s).toLocaleDateString("id-ID", long
    ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
    : { day: "2-digit", month: "short", year: "numeric" });
}

function getFilteredTxs(all: KasTx[], view: ListView): KasTx[] {
  switch (view.kind) {
    case "tx-list":
      if (view.filter === "masuk")  return all.filter(t => t.jenis === "MASUK");
      if (view.filter === "keluar") return all.filter(t => t.jenis === "KELUAR");
      return all;
    case "tx-kategori":
      return all.filter(t => t.kategori === view.kategori);
    case "tx-bulan":
      return all.filter(t => {
        const d = new Date(t.tanggal);
        return d.getMonth() + 1 === view.bulan && d.getFullYear() === view.tahun;
      });
  }
}

function panelTitle(v: PanelView, tahun: number): string {
  switch (v.kind) {
    case "tx-list":      return v.title;
    case "tx-kategori":  return `Kategori: ${v.kategori}`;
    case "tx-bulan":     return `${BULAN_FULL[v.bulan - 1]} ${tahun}`;
    case "tx-detail":    return "Detail Transaksi";
    case "iuran-detail": return v.t.nama;
  }
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 200, H = 40;
  const allZero = values.every(v => v === 0);
  if (allZero) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10" preserveAspectRatio="none">
        <path d={`M 0 ${H*.55} Q ${W*.2} ${H*.45} ${W*.4} ${H*.55} T ${W*.7} ${H*.52} T ${W} ${H*.55}`}
          fill="none" stroke={color} strokeWidth="2" opacity="0.35" strokeLinecap="round" />
      </svg>
    );
  }
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => ({ x: (i / (values.length - 1)) * W, y: H * .85 - (v / max) * H * .65 }));
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i-1], c = pts[i];
    const cx = ((p.x + c.x) / 2).toFixed(1);
    d += ` C ${cx} ${p.y.toFixed(1)} ${cx} ${c.y.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

function DonutChart({
  segments, centerLabel, centerSub, onSegmentClick,
}: {
  segments:        { color: string; value: number; label: string }[];
  centerLabel:     string;
  centerSub:       string;
  onSegmentClick?: (label: string, color: string) => void;
}) {
  const r = 56, cx = 70, cy = 70, sw = 18;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let angle = -90;
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
      {total > 0 && segments.map((seg, i) => {
        if (seg.value === 0) return null;
        const frac = seg.value / total;
        const len  = frac * C;
        const a    = angle;
        angle     += frac * 360;
        return (
          <circle
            key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={sw}
            strokeDasharray={`${len} ${C}`} strokeDashoffset={0}
            transform={`rotate(${a}, ${cx}, ${cy})`}
            className={onSegmentClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
            onClick={() => onSegmentClick?.(seg.label, seg.color)}
          />
        );
      })}
      <text x={cx} y={cy - 7} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#111827">{centerLabel}</text>
      <text x={cx} y={cy + 7} textAnchor="middle" fontSize="7.5" fill="#6b7280">{centerSub}</text>
    </svg>
  );
}

// ─── Monthly Bar Chart ────────────────────────────────────────────────────────

function MonthlyBarChart({
  monthly, onBarClick,
}: {
  monthly:      { bulan: number; jumlahTerkumpul: number }[];
  onBarClick?:  (bulan: number) => void;
}) {
  const maxVal = Math.max(...monthly.map(m => m.jumlahTerkumpul), 1);
  const mag    = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const yMax   = Math.max(Math.ceil(maxVal / mag) * mag, 100_000);

  const VW = 540, VH = 185;
  const lPad = 70, rPad = 8, tPad = 22, bPad = 26;
  const cW = VW - lPad - rPad, cH = VH - tPad - bPad;
  const colW = cW / 12;
  const barW = Math.max(colW * 0.52, 10);

  const yTicks = [0, .25, .5, .75, 1].map(f => Math.round(f * yMax));
  const bX = (i: number) => lPad + i * colW + (colW - barW) / 2;
  const bH = (v: number) => (v / yMax) * cH;
  const bY = (v: number) => tPad + cH - bH(v);

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ height: 185 }}>
      {yTicks.map(tick => {
        const y = tPad + cH - (tick / yMax) * cH;
        return (
          <g key={tick}>
            <line x1={lPad} y1={y} x2={VW - rPad} y2={y}
              stroke={tick === 0 ? "#d1d5db" : "#e5e7eb"} strokeWidth="1"
              strokeDasharray={tick === 0 ? "none" : "4,4"} />
            <text x={lPad - 5} y={y + 3.5} textAnchor="end" fontSize="7.5" fill="#9ca3af">
              {tick === 0 ? "Rp 0" : `Rp ${fmtCompact(tick)}`}
            </text>
          </g>
        );
      })}
      {monthly.map((m, i) => {
        const h = bH(m.jumlahTerkumpul), x = bX(i), y = bY(m.jumlahTerkumpul);
        const mid = x + barW / 2, hasVal = m.jumlahTerkumpul > 0;
        return (
          <g key={m.bulan}
            className={onBarClick && hasVal ? "cursor-pointer" : ""}
            onClick={() => hasVal && onBarClick?.(m.bulan)}
          >
            {hasVal ? (
              <>
                <rect x={x} y={y} width={barW} height={h} fill="#3b82f6" rx="3"
                  className={onBarClick ? "hover:fill-blue-700 transition-colors" : ""} />
                <text x={mid} y={y - 4} textAnchor="middle" fontSize="7" fill="#374151" fontWeight="500">
                  {fmtCompact(m.jumlahTerkumpul)}
                </text>
              </>
            ) : (
              <>
                <rect x={x} y={tPad + cH - 3} width={barW} height={3} fill="#e5e7eb" rx="1.5" />
                <text x={mid} y={tPad + cH - 6} textAnchor="middle" fontSize="7" fill="#d1d5db">0</text>
              </>
            )}
            <text x={mid} y={VH - 3} textAnchor="middle" fontSize="7.5" fill="#6b7280">
              {BULAN_LABEL[m.bulan - 1]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Ring Progress ────────────────────────────────────────────────────────────

function RingProgress({ pct, color, size = "md" }: { pct: number; color: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? 96 : size === "sm" ? 56 : 72;
  const cx = dim / 2, cy = dim / 2;
  const r  = size === "lg" ? 38 : size === "sm" ? 20 : 28;
  const sw = size === "lg" ? 9  : size === "sm" ? 5  : 7;
  const fs = size === "lg" ? 14 : size === "sm" ? 9  : 11;
  const C      = 2 * Math.PI * r;
  const filled = (Math.min(pct, 100) / 100) * C;
  return (
    <svg viewBox={`0 0 ${dim} ${dim}`} className={size === "lg" ? "w-24 h-24" : size === "sm" ? "w-14 h-14" : "w-16 h-16"} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
      {pct > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${filled} ${C}`} strokeDashoffset={0}
          transform={`rotate(-90, ${cx}, ${cy})`} strokeLinecap="round" />
      )}
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={fs} fontWeight="bold" fill="#111827">{pct}%</text>
    </svg>
  );
}

// ─── Slide-Over Panel ─────────────────────────────────────────────────────────

function SlideOver({ open, onClose, title, onBack, children }: {
  open:      boolean;
  onClose:   () => void;
  title:     string;
  onBack?:   () => void;
  children:  React.ReactNode;
}) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      )}
      <div className={cn(
        "fixed top-0 right-0 h-full w-full sm:max-w-[520px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full",
      )}>
        <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0">
          {onBack && (
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="font-semibold flex-1 truncate">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TxRow({ tx, onClick }: { tx: KasTx; onClick: () => void }) {
  const isMasuk = tx.jenis === "MASUK";
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors border-b last:border-0 text-left"
    >
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
        isMasuk ? "bg-green-100" : "bg-red-100",
      )}>
        {isMasuk
          ? <Download className="h-4 w-4 text-green-600" />
          : <Upload   className="h-4 w-4 text-red-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.keterangan || tx.kategori}</p>
        <p className="text-xs text-muted-foreground">
          {tx.kategori} · {fmtDate(tx.tanggal)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn("text-sm font-bold", isMasuk ? "text-green-600" : "text-red-600")}>
          {isMasuk ? "+" : "-"}{fmtRp(tx.jumlah)}
        </p>
        <ArrowRight className="h-3.5 w-3.5 text-gray-300 ml-auto mt-0.5" />
      </div>
    </button>
  );
}

// ─── Transaction List Panel Content ──────────────────────────────────────────

function TxListContent({ txs, onTxClick }: { txs: KasTx[]; onTxClick: (tx: KasTx) => void }) {
  const totalMasuk  = txs.filter(t => t.jenis === "MASUK").reduce((s, t) => s + t.jumlah, 0);
  const totalKeluar = txs.filter(t => t.jenis === "KELUAR").reduce((s, t) => s + t.jumlah, 0);
  return (
    <div>
      {/* Summary strip */}
      <div className="flex gap-3 p-4 bg-gray-50 border-b">
        {totalMasuk > 0 && (
          <div className="flex-1 bg-white rounded-xl p-3 border text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Masuk</p>
            <p className="font-bold text-green-600 text-sm">{fmtRp(totalMasuk)}</p>
          </div>
        )}
        {totalKeluar > 0 && (
          <div className="flex-1 bg-white rounded-xl p-3 border text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Keluar</p>
            <p className="font-bold text-red-600 text-sm">{fmtRp(totalKeluar)}</p>
          </div>
        )}
        <div className="flex-1 bg-white rounded-xl p-3 border text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Transaksi</p>
          <p className="font-bold text-sm">{txs.length}</p>
        </div>
      </div>

      {/* List */}
      {txs.length === 0 ? (
        <div className="py-16 text-center">
          <Receipt className="h-12 w-12 mx-auto text-gray-200 mb-3" />
          <p className="text-muted-foreground">Belum ada transaksi</p>
        </div>
      ) : (
        <div className="divide-y">
          {txs.map(tx => (
            <TxRow key={tx.id} tx={tx} onClick={() => onTxClick(tx)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Transaction Detail Panel Content ────────────────────────────────────────

function TxDetailContent({ tx }: { tx: KasTx }) {
  const isMasuk = tx.jenis === "MASUK";
  const gradient = isMasuk ? "from-green-500 to-emerald-600" : "from-red-500 to-rose-600";

  function IR({ Icon, label, value }: { Icon: React.ElementType; label: string; value: string }) {
    return (
      <div className="flex items-start gap-3 px-5 py-3.5 bg-white">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
        <span className="text-sm flex-1 font-medium">{value}</span>
      </div>
    );
  }

  return (
    <div>
      {/* Color header */}
      <div className={`bg-gradient-to-br ${gradient} text-white p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 rounded-full p-3">
            {isMasuk ? <Download className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
          </div>
          <div>
            <p className="text-white/70 text-sm">{tx.kategori}</p>
            <p className="font-semibold">{tx.keterangan || "—"}</p>
          </div>
        </div>
        <div className="bg-white/20 rounded-xl p-4 text-center">
          <p className="text-white/70 text-xs uppercase tracking-wider">Jumlah</p>
          <p className="text-3xl font-bold mt-1">{fmtRp(tx.jumlah)}</p>
        </div>
      </div>

      {/* Details */}
      <div className="divide-y border-b">
        <IR Icon={CalendarDays} label="Tanggal"   value={fmtDate(tx.tanggal, true)} />
        <IR Icon={Tag}          label="Jenis"      value={tx.jenis} />
        <IR Icon={Banknote}     label="Kategori"   value={tx.kategori} />
        <IR Icon={Info}         label="Keterangan" value={tx.keterangan || "—"} />
        <IR Icon={Receipt}      label="Nominal"    value={fmtRp(tx.jumlah)} />
      </div>

      <div className="p-5 bg-gray-50">
        <div className={cn(
          "rounded-xl p-4 flex items-center gap-3",
          isMasuk ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200",
        )}>
          {isMasuk
            ? <CheckCircle2 className="h-7 w-7 text-green-500 shrink-0" />
            : <AlertCircle  className="h-7 w-7 text-red-400   shrink-0" />}
          <div>
            <p className={cn("font-semibold text-sm", isMasuk ? "text-green-700" : "text-red-700")}>
              {isMasuk ? "Pemasukan Kas" : "Pengeluaran Kas"}
            </p>
            <p className={cn("text-xs mt-0.5", isMasuk ? "text-green-600" : "text-red-600")}>
              Tercatat pada {fmtDate(tx.tanggal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Iuran Detail Panel Content ───────────────────────────────────────────────

function IuranDetailContent({ t }: { t: IuranByType }) {
  const pct   = t.totalTagihan > 0 ? Math.round((t.totalLunas / t.totalTagihan) * 100) : 0;
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const belum = t.totalTagihan - t.totalLunas;

  return (
    <div className="p-5 space-y-6">
      {/* Ring + stats */}
      <div className="flex flex-col items-center gap-4">
        <RingProgress pct={pct} color={color} size="lg" />
        <div>
          <p className="text-center text-sm text-muted-foreground">
            {t.totalLunas} dari {t.totalTagihan} warga sudah membayar
          </p>
          <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden w-64 mx-auto">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Tagihan", val: t.totalTagihan,    unit: "warga",   color: "text-blue-700  bg-blue-50" },
          { label: "Sudah Lunas",   val: t.totalLunas,     unit: "warga",   color: "text-green-700 bg-green-50" },
          { label: "Belum Bayar",   val: belum,             unit: "warga",   color: "text-red-700   bg-red-50" },
          { label: "Terkumpul",     val: fmtRp(t.jumlahTerkumpul), unit: "", color: "text-primary   bg-primary/5" },
        ].map(stat => (
          <div key={stat.label} className={cn("rounded-xl px-4 py-3 space-y-0.5", stat.color)}>
            <p className="text-[11px] uppercase tracking-wide opacity-70 font-medium">{stat.label}</p>
            <p className="text-xl font-bold leading-tight">{stat.val}</p>
            {stat.unit && <p className="text-[11px] opacity-70">{stat.unit}</p>}
          </div>
        ))}
      </div>

      {/* Periode + deskripsi */}
      <div className="space-y-2">
        <span className="inline-block text-[11px] uppercase tracking-wide font-medium px-3 py-1 border rounded-full text-muted-foreground">
          {t.periode}
        </span>
        {t.deskripsi && <p className="text-sm text-muted-foreground">{t.deskripsi}</p>}
      </div>

      {/* Privacy note */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <Eye className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Data iuran ini disajikan secara agregat untuk menjaga privasi warga. Detail pembayaran per individu tidak ditampilkan.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransparansiPage() {
  const [data, setData]       = useState<TransparansiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tahun, setTahun]     = useState(new Date().getFullYear());
  const [panel, setPanel]     = useState<PanelView | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/v1/keuangan/transparansi?tahun=${tahun}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }, [tahun]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const yearOptions = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 2 + i);

  // Panel helpers
  function openList(filter: "masuk" | "keluar" | "all") {
    const title = filter === "masuk"  ? "Semua Pemasukan"
                : filter === "keluar" ? "Semua Pengeluaran"
                : "Semua Transaksi";
    setPanel({ kind: "tx-list", filter, title });
  }
  function openKateg(kategori: string, color: string) {
    setPanel({ kind: "tx-kategori", kategori, color });
  }
  function openBulan(bulan: number) {
    setPanel({ kind: "tx-bulan", bulan, tahun });
  }
  function openTxDetail(tx: KasTx) {
    const current = panel;
    setPanel({ kind: "tx-detail", tx, from: current?.kind !== "tx-detail" ? (current as ListView | undefined) : undefined });
  }
  function openIuranDetail(t: IuranByType) {
    setPanel({ kind: "iuran-detail", t });
  }
  function panelBack() {
    if (panel?.kind === "tx-detail") setPanel(panel.from ?? null);
    else setPanel(null);
  }

  // Derived
  const allTx   = data?.kas.allTransactions ?? [];
  const panelTxs: KasTx[] = panel && panel.kind !== "tx-detail" && panel.kind !== "iuran-detail"
    ? getFilteredTxs(allTx, panel)
    : [];

  const kas   = data?.kas;
  const iuran = data?.iuran;

  // Category donut data (pengeluaran)
  const catSegments = (kas?.byCategory ?? [])
    .filter(c => c.keluar > 0)
    .sort((a, b) => b.keluar - a.keluar)
    .map((c, i) => ({ label: c.kategori, value: c.keluar, color: CAT_COLORS[i % CAT_COLORS.length] }));
  const totalKeluar = catSegments.reduce((s, c) => s + c.value, 0);

  // Sparkline values
  const masukValues  = (kas?.monthlyKas ?? []).map(m => m.masuk);
  const keluarValues = (kas?.monthlyKas ?? []).map(m => m.keluar);
  const saldoValues  = (kas?.monthlyKas ?? []).map((_, i) => {
    const cumM = (kas?.monthlyKas ?? []).slice(0, i+1).reduce((s, x) => s + x.masuk,  0);
    const cumK = (kas?.monthlyKas ?? []).slice(0, i+1).reduce((s, x) => s + x.keluar, 0);
    return Math.max(cumM - cumK, 0);
  });

  // Recent transactions for horizontal scroll
  const recentTxs = allTx.slice(0, 15);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Transparansi Keuangan RT</h1>
            <p className="text-sm text-muted-foreground">Laporan keuangan yang terbuka untuk semua warga</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="h-36 animate-pulse bg-gray-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 animate-pulse bg-gray-100 rounded-2xl" />
          <div className="h-64 animate-pulse bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-red-500">Gagal memuat data.</p>;

  return (
    <>
      {/* ── Slide-Over Panel ── */}
      <SlideOver
        open={panel !== null}
        onClose={() => setPanel(null)}
        title={panel ? panelTitle(panel, tahun) : ""}
        onBack={panel?.kind === "tx-detail" ? panelBack : undefined}
      >
        {panel?.kind === "iuran-detail" && (
          <IuranDetailContent t={panel.t} />
        )}
        {panel?.kind === "tx-detail" && (
          <TxDetailContent tx={panel.tx} />
        )}
        {panel && panel.kind !== "tx-detail" && panel.kind !== "iuran-detail" && (
          <TxListContent txs={panelTxs} onTxClick={openTxDetail} />
        )}
      </SlideOver>

      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Transparansi Keuangan RT</h1>
            <p className="text-sm text-muted-foreground">Laporan keuangan yang terbuka untuk semua warga</p>
          </div>
          <div className="relative">
            <select
              value={tahun}
              onChange={e => setTahun(Number(e.target.value))}
              className="appearance-none pl-3 pr-8 py-2 border rounded-lg text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* ── Info banner ── */}
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
          <Eye className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Laporan Terbuka</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Data ini diperbarui secara real-time oleh pengurus RT.
              Setiap warga berhak mengetahui penggunaan kas bersama.
            </p>
          </div>
        </div>

        {/* ── Stat cards — CLICKABLE ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <button
            onClick={() => openList("masuk")}
            className="text-left group"
          >
            <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group-hover:border-green-200">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Pemasukan</p>
                  <ArrowRight className="h-4 w-4 text-gray-300 ml-auto group-hover:text-green-400 transition-colors" />
                </div>
                <p className="text-2xl font-bold text-green-600">{fmtRp(kas!.totalMasuk)}</p>
                <Sparkline values={masukValues} color="#22c55e" />
              </CardContent>
            </Card>
          </button>

          <button
            onClick={() => openList("keluar")}
            className="text-left group"
          >
            <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group-hover:border-red-200">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">Pengeluaran</p>
                  <ArrowRight className="h-4 w-4 text-gray-300 ml-auto group-hover:text-red-400 transition-colors" />
                </div>
                <p className="text-2xl font-bold text-red-600">{fmtRp(kas!.totalKeluar)}</p>
                <Sparkline values={keluarValues} color="#ef4444" />
              </CardContent>
            </Card>
          </button>

          <button
            onClick={() => openList("all")}
            className="text-left group"
          >
            <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group-hover:border-blue-200">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Wallet className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <ArrowRight className="h-4 w-4 text-gray-300 ml-auto group-hover:text-blue-400 transition-colors" />
                </div>
                <p className={cn("text-2xl font-bold", kas!.saldo >= 0 ? "text-blue-600" : "text-red-600")}>
                  {fmtRp(kas!.saldo)}
                </p>
                <Sparkline values={saldoValues} color="#3b82f6" />
              </CardContent>
            </Card>
          </button>
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Donut: Penggunaan Dana per Kategori — segments + legend CLICKABLE */}
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold text-base mb-4">Penggunaan Dana per Kategori</h2>
              {catSegments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">Belum ada data pengeluaran</p>
              ) : (
                <>
                  <div className="flex items-center gap-5">
                    <div className="w-36 h-36 shrink-0">
                      <DonutChart
                        segments={catSegments}
                        centerLabel={fmtRp(totalKeluar)}
                        centerSub="Total Pengeluaran"
                        onSegmentClick={openKateg}
                      />
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      {catSegments.map(seg => {
                        const pct = totalKeluar > 0 ? Math.round((seg.value / totalKeluar) * 100) : 0;
                        return (
                          <button
                            key={seg.label}
                            onClick={() => openKateg(seg.label, seg.color)}
                            className="w-full flex items-center gap-2 hover:bg-gray-50 -mx-1 px-1 py-0.5 rounded transition-colors group/leg"
                          >
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                            <span className="text-sm flex-1 min-w-0 text-left truncate group-hover/leg:text-foreground">{seg.label}</span>
                            <span className="text-sm text-muted-foreground shrink-0 w-8 text-right">{pct}%</span>
                            <ArrowRight className="h-3 w-3 text-gray-300 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => openList("keluar")}
                    className="mt-4 flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Lihat detail kategori <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Bar chart: Iuran per Bulan — bars CLICKABLE */}
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold text-base mb-4">Iuran Terkumpul per Bulan</h2>
              <MonthlyBarChart monthly={iuran!.monthly} onBarClick={openBulan} />
              <button
                onClick={() => openList("masuk")}
                className="mt-2 flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Lihat laporan bulanan <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* ── Koleksi Iuran Warga — cards CLICKABLE ── */}
        <div>
          <h2 className="font-semibold text-base mb-3">Koleksi Iuran Warga — {tahun}</h2>
          {iuran!.byType.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Belum ada data iuran</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {iuran!.byType.map(t => {
                const pct   = t.totalTagihan > 0 ? Math.round((t.totalLunas / t.totalTagihan) * 100) : 0;
                const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
                return (
                  <button
                    key={t.nama}
                    onClick={() => openIuranDetail(t)}
                    className="text-left group"
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer group-hover:border-primary/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <RingProgress pct={pct} color={color} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{t.nama}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {t.totalLunas} dari {t.totalTagihan} warga sudah bayar
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-primary text-sm">{fmtRp(t.jumlahTerkumpul)}</p>
                                <p className="text-[10px] text-muted-foreground">terkumpul</p>
                              </div>
                            </div>
                            <div className="mt-2.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="inline-block text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 border rounded-full text-muted-foreground">
                                {t.periode}
                              </span>
                              <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary transition-colors" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Transaksi Kas Terbaru — each card CLICKABLE ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">Transaksi Kas Terbaru</h2>
            <button
              onClick={() => openList("all")}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Lihat semua transaksi <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentTxs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Belum ada transaksi</CardContent>
            </Card>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
              {recentTxs.map(tx => {
                const isMasuk = tx.jenis === "MASUK";
                return (
                  <button
                    key={tx.id}
                    onClick={() => openTxDetail(tx)}
                    className="min-w-[180px] max-w-[180px] shrink-0 border rounded-xl p-4 bg-white
                               hover:shadow-md hover:border-primary/30 transition-all text-left space-y-2 group"
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center",
                      isMasuk ? "bg-green-100" : "bg-red-100",
                    )}>
                      {isMasuk
                        ? <Download className="h-4 w-4 text-green-600" />
                        : <Upload   className="h-4 w-4 text-red-500" />}
                    </div>
                    <span className={cn(
                      "inline-block text-[10px] font-bold px-2 py-0.5 rounded-full",
                      isMasuk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
                    )}>
                      {tx.jenis}
                    </span>
                    <p className="text-sm font-semibold line-clamp-1">{tx.keterangan || tx.kategori}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(tx.tanggal)}</p>
                    <p className={cn("text-sm font-bold", isMasuk ? "text-green-600" : "text-red-600")}>
                      {isMasuk ? "+" : "-"}{fmtRp(tx.jumlah)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer note ── */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 rounded-lg px-4 py-3 border">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          Semua data keuangan diperbarui secara berkala dan dapat diaudit oleh warga sesuai kebutuhan.
        </div>
      </div>
    </>
  );
}

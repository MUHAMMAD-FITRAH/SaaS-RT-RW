"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import {
  Receipt, CheckCircle2, Clock, AlertCircle,
  Camera, Loader2, X, Upload, CreditCard,
  CheckCircle, XCircle, Info, ChevronRight,
  CalendarDays, Hash, Banknote, Tag,
  QrCode, Building2, Wallet, ExternalLink,
  RefreshCw, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus = "LUNAS" | "MENUNGGU_KONFIRMASI" | "BELUM_BAYAR" | "TERSEDIA";
type ToastType     = "success" | "pending" | "error" | "info";

interface IuranPayment {
  id:                string;
  bulan:             number;
  tahun:             number;
  jumlah:            number;
  tanggalBayar:      string | null;
  metodeBayar:       string | null;
  buktiUrl:          string | null;
  catatan:           string | null;
  iuranType:         string;
  iuranTypeId:       string;
  periode:           string;
  isJumlahFleksibel: boolean;
  lunas:             boolean;
  status:            PaymentStatus;
}

interface Summary {
  totalTagihan: number; totalLunas: number;
  totalMenunggu: number; totalTunggakan: number;
  totalAkanDatang: number; totalBayar: number;
  totalHutang: number; totalBisaDibayar: number;
}

interface IuranData {
  tahun: number;
  warga: { id: string; namaLengkap: string };
  summary: Summary;
  payments: IuranPayment[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni",
               "Juli","Agustus","September","Oktober","November","Desember"];

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const fmtShort = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

function parseMidtrans(catatan: string | null) {
  if (!catatan?.includes("Midtrans")) return { isMidtrans: false, paymentType: "", orderId: "" };
  const p = catatan.split(" · ");
  return { isMidtrans: true, paymentType: p[1] ?? "", orderId: p[2] ?? "" };
}

function ptDisplay(pt: string): { label: string; Icon: React.ElementType } {
  const t = pt.toLowerCase();
  if (t.includes("qris"))   return { label: "QRIS",          Icon: QrCode };
  if (t.includes("gopay"))  return { label: "GoPay",         Icon: Wallet };
  if (t.includes("shoppe")) return { label: "ShopeePay",     Icon: Wallet };
  if (t.includes("dana"))   return { label: "DANA",          Icon: Wallet };
  if (t.includes("ovo"))    return { label: "OVO",           Icon: Wallet };
  if (t.includes("bank") || t.includes("bca") || t.includes("bni") || t.includes("bri"))
                            return { label: "Transfer Bank", Icon: Building2 };
  if (t.includes("credit")) return { label: "Kartu Kredit",  Icon: CreditCard };
  if (pt)                   return { label: pt,              Icon: Banknote };
  return                           { label: "Online",        Icon: CreditCard };
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ type, message, onClose }: { type: ToastType; message: string; onClose: () => void }) {
  const cfg = {
    success: { bg: "bg-green-600", Icon: CheckCircle },
    pending: { bg: "bg-yellow-500", Icon: Clock },
    error:   { bg: "bg-red-600",   Icon: XCircle },
    info:    { bg: "bg-blue-600",  Icon: Info },
  }[type];
  useEffect(() => { const t = setTimeout(onClose, 8000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-[200] flex items-center gap-3 text-white ${cfg.bg} px-5 py-3 rounded-xl shadow-xl max-w-sm`}>
      <cfg.Icon className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={onClose}><X className="h-4 w-4 opacity-70 hover:opacity-100" /></button>
    </div>
  );
}

// ─── Timeline & Info Row ──────────────────────────────────────────────────────

function TL({ Icon, label, desc, done, success = false }: {
  Icon: React.ElementType; label: string; desc?: string; done: boolean; success?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${done ? (success ? "bg-green-50" : "bg-gray-50") : "bg-gray-50/50 opacity-50"}`}>
      <div className={`rounded-full p-1.5 ${done ? (success ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-600") : "bg-gray-100 text-gray-400"}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1"><p className="text-sm font-medium">{label}</p>{desc && <p className="text-xs text-muted-foreground">{desc}</p>}</div>
      {done && <CheckCircle2 className={`h-4 w-4 shrink-0 ${success ? "text-green-500" : "text-gray-400"}`} />}
    </div>
  );
}

function IR({ Icon, label, value, vc = "" }: { Icon: React.ElementType; label: string; value: string; vc?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
      <span className={`text-sm flex-1 min-w-0 ${vc}`}>{value}</span>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "LUNAS") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
      <CheckCircle2 className="h-3 w-3" /> Lunas
    </span>
  );
  if (status === "MENUNGGU_KONFIRMASI") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
      <Clock className="h-3 w-3" /> Menunggu
    </span>
  );
  if (status === "TERSEDIA") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
      <CalendarDays className="h-3 w-3" /> Bisa Dibayar
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-medium">
      <AlertCircle className="h-3 w-3" /> Belum Bayar
    </span>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

function DonutChart({ segments, total }: { segments: { color: string; value: number }[]; total: number }) {
  const r = 36;
  const cx = 50;
  const cy = 50;
  const sw = 13;
  const C = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
      </svg>
    );
  }

  let angle = -90; // start at 12 o'clock
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
      {segments.map((seg, i) => {
        if (seg.value === 0) return null;
        const frac = seg.value / total;
        const len  = frac * C;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={sw}
            strokeDasharray={`${len} ${C}`}
            strokeDashoffset={0}
            transform={`rotate(${angle}, ${cx}, ${cy})`}
          />
        );
        angle += frac * 360;
        return el;
      })}
    </svg>
  );
}

// ─── Ringkasan Card ───────────────────────────────────────────────────────────

function RingkasanCard({ data, tahun, onTahunChange, onBayarSekarang }: {
  data: IuranData;
  tahun: number;
  onTahunChange: (y: number) => void;
  onBayarSekarang: () => void;
}) {
  const s        = data.summary;
  const payments = data.payments;
  const thisYear = new Date().getFullYear();

  const rows = [
    {
      label: "Lunas",
      count: s.totalLunas,
      color: "#3b82f6",
      amt: payments.filter(p => p.status === "LUNAS").reduce((a, p) => a + Number(p.jumlah), 0),
    },
    {
      label: "Siap Bayar",
      count: s.totalAkanDatang,
      color: "#22c55e",
      amt: payments.filter(p => p.status === "TERSEDIA").reduce((a, p) => a + Number(p.jumlah), 0),
    },
    {
      label: "Belum Bayar",
      count: s.totalTunggakan,
      color: "#f59e0b",
      amt: payments.filter(p => p.status === "BELUM_BAYAR").reduce((a, p) => a + Number(p.jumlah), 0),
    },
    {
      label: "Menunggu Verifikasi",
      count: s.totalMenunggu,
      color: "#ef4444",
      amt: payments.filter(p => p.status === "MENUNGGU_KONFIRMASI").reduce((a, p) => a + Number(p.jumlah), 0),
    },
  ];

  const total      = s.totalTagihan;
  const hasPayable = s.totalTunggakan + s.totalAkanDatang > 0;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="font-bold text-base">Ringkasan Iuran {tahun}</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Tahun:</span>
            <select
              value={tahun}
              onChange={e => onTahunChange(Number(e.target.value))}
              className="border rounded-md px-2 py-1 text-sm bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {Array.from({ length: 5 }, (_, i) => thisYear - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Chart + Legend + Action */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Donut */}
          <div className="relative w-36 h-36 flex-shrink-0">
            <DonutChart
              segments={rows.map(r => ({ color: r.color, value: r.count }))}
              total={total}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-bold leading-none">{total}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 text-center">Total Tagihan</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 w-full space-y-2.5">
            {rows.map(row => (
              <div key={row.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                <span className="text-sm flex-1 min-w-0">{row.label}</span>
                <span className="text-sm text-muted-foreground whitespace-nowrap text-right hidden sm:inline">
                  {row.count} tagihan ({total > 0 ? ((row.count / total) * 100).toFixed(1) : "0.0"}%)
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap text-right sm:hidden">
                  {row.count} ({total > 0 ? ((row.count / total) * 100).toFixed(0) : 0}%)
                </span>
                <span className="text-sm font-medium w-24 text-right whitespace-nowrap">{fmt(row.amt)}</span>
              </div>
            ))}
          </div>

          {/* Bayar Sekarang */}
          {hasPayable && (
            <div className="flex-shrink-0 w-full sm:w-44 border-2 border-primary/20 rounded-xl p-4 text-center space-y-2 bg-blue-50/50">
              <p className="text-sm font-semibold text-primary">Bayar lebih awal</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Iuran bulan depan dan seterusnya sudah bisa dibayar lebih awal.
              </p>
              <Button size="sm" className="w-full" onClick={onBayarSekarang}>
                Bayar Sekarang
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Iuran Type Card ──────────────────────────────────────────────────────────

function IuranTypeCard({ typeName, payments, onSelect }: {
  typeName: string;
  payments: IuranPayment[];
  onSelect: (p: IuranPayment) => void;
}) {
  const lunas      = payments.filter(p => p.status === "LUNAS").length;
  const belumBayar = payments.filter(p => p.status === "BELUM_BAYAR").length;
  const tersedia   = payments.filter(p => p.status === "TERSEDIA").length;
  const menunggu   = payments.filter(p => p.status === "MENUNGGU_KONFIRMASI").length;

  const actionable     = payments.filter(p => p.status !== "LUNAS");
  const previewPayments = actionable.length > 0 ? actionable : payments.slice(0, 4);

  return (
    <Card className="overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-bold text-base">{typeName}</h3>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <Badge variant="outline" className="text-xs font-normal uppercase tracking-wide">
            {payments[0]?.periode ?? "BULANAN"}
          </Badge>
          <Badge className="text-xs bg-primary text-primary-foreground hover:bg-primary">
            {lunas}/{payments.length} Lunas
          </Badge>
          {tersedia > 0 && (
            <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
              {tersedia} Bisa Dibayar
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Stats chips */}
        <div className="flex gap-2 flex-wrap text-xs">
          <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            {payments.length} periode
          </span>
          {belumBayar > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-medium">
              {belumBayar} belum bayar
            </span>
          )}
          {menunggu > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 font-medium">
              {menunggu} menunggu
            </span>
          )}
          {tersedia > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
              {tersedia} mendatang
            </span>
          )}
        </div>

        {/* Horizontal scroll of period cards */}
        <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none]">
          {previewPayments.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="min-w-[180px] max-w-[180px] shrink-0 snap-start rounded-xl border bg-white px-3 py-3 text-left hover:border-primary/40 hover:bg-gray-50/80 transition-all"
            >
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <p className="font-bold text-sm">{BULAN[p.bulan - 1]} {p.tahun}</p>
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">{fmt(Number(p.jumlah))}</p>
              <StatusBadge status={p.status} />
            </button>
          ))}
        </div>

        {payments.length > previewPayments.length && (
          <p className="text-xs text-muted-foreground">
            Menampilkan {previewPayments.length} item ringkas dari {payments.length} periode. Klik kartu untuk detail pembayaran.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Payment Detail Modal ─────────────────────────────────────────────────────

function PaymentDetailModal({ payment, onClose, onRefresh, onToast }: {
  payment:   IuranPayment;
  onClose:   () => void;
  onRefresh: () => void;
  onToast:   (t: ToastType, m: string) => void;
}) {
  const inputRef                   = useRef<HTMLInputElement>(null);
  const [view, setView]            = useState<"detail" | "upload">("detail");
  const [preview, setPreview]      = useState<string | null>(payment.buktiUrl);
  const [uploadedUrl, setUploaded] = useState<string | null>(payment.buktiUrl);
  const [uploading, setUploading]  = useState(false);
  const [saving, setSaving]        = useState(false);
  const [paying, setPaying]        = useState(false);
  const [pendingCheck, setPendingCheck] = useState<{ orderId: string; paymentId: string } | null>(null);
  const [checking, setChecking]    = useState(false);

  const mt  = parseMidtrans(payment.catatan);
  const ptD = ptDisplay(mt.paymentType);

  async function handlePay() {
    setPaying(true);
    try {
      const res  = await fetch("/api/v1/iuran/snap-token", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ paymentId: payment.id }),
      });
      const data = await res.json();
      if (!data.success) {
        onToast("error", data.error ?? "Gagal membuat sesi pembayaran. Coba lagi.");
        return;
      }
      const { redirectUrl, orderId, paymentId } = data.data as {
        redirectUrl: string; orderId: string; paymentId: string;
      };
      setPendingCheck({ orderId, paymentId });
      window.open(redirectUrl, "_blank", "noopener,noreferrer");
    } catch {
      onToast("error", "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setPaying(false);
    }
  }

  async function handleCekStatus() {
    if (!pendingCheck) return;
    setChecking(true);
    try {
      const res = await fetch("/api/v1/iuran/snap-confirm", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(pendingCheck),
      });
      const d = await res.json();
      if (d.data?.paid) {
        onToast("success", "🎉 Pembayaran berhasil dikonfirmasi!");
        onClose(); setTimeout(onRefresh, 500);
      } else if (d.data?.pending) {
        onToast("pending", "Pembayaran belum selesai atau masih diproses Midtrans.");
      } else if (d.data?.failed) {
        onToast("error", "Pembayaran gagal atau dibatalkan.");
        setPendingCheck(null);
      } else if (d.data?.alreadyPaid) {
        onToast("success", "Iuran sudah dikonfirmasi lunas!");
        onClose(); onRefresh();
      } else {
        onToast("info", d.data?.message ?? "Status tidak diketahui. Coba refresh halaman.");
      }
    } finally { setChecking(false); }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setPreview(URL.createObjectURL(file)); setUploading(true);
    const fd = new FormData(); fd.append("file", file); fd.append("type", "bukti");
    const res = await fetch("/api/v1/upload", { method: "POST", body: fd });
    const d   = await res.json(); setUploading(false);
    if (d.data?.url) setUploaded(d.data.url);
  }

  async function handleSaveUpload() {
    if (!uploadedUrl) return; setSaving(true);
    const res = await fetch("/api/v1/iuran-saya", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ paymentId: payment.id, buktiUrl: uploadedUrl }),
    });
    const d = await res.json(); setSaving(false);
    if (d.success) { onToast("info", "Bukti dikirim. Menunggu konfirmasi pengurus RT."); onRefresh(); onClose(); }
    else onToast("error", d.error ?? "Gagal mengirim bukti");
  }

  const statusGradient = {
    LUNAS: "from-green-500 to-emerald-600",
    MENUNGGU_KONFIRMASI: "from-yellow-400 to-amber-500",
    BELUM_BAYAR: "from-red-500 to-rose-600",
    TERSEDIA: "from-blue-500 to-cyan-600",
  }[payment.status];

  const statusLabel = {
    LUNAS: "Lunas",
    MENUNGGU_KONFIRMASI: "Menunggu Konfirmasi",
    BELUM_BAYAR: "Belum Dibayar",
    TERSEDIA: "Bisa Dibayar",
  }[payment.status];

  const StatusIcon = {
    LUNAS: CheckCircle2,
    MENUNGGU_KONFIRMASI: Clock,
    BELUM_BAYAR: AlertCircle,
    TERSEDIA: CalendarDays,
  }[payment.status];

  const canPayNow = payment.status === "BELUM_BAYAR" || payment.status === "TERSEDIA";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">

        {/* Gradient Header */}
        <div className={`bg-gradient-to-br ${statusGradient} text-white p-6 relative shrink-0`}>
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-1.5">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-4">
            <div className="bg-white/20 rounded-full p-3"><Receipt className="h-7 w-7" /></div>
            <div className="flex-1 pr-8">
              <p className="text-white/80 text-sm">{payment.iuranType}</p>
              <h2 className="text-xl font-bold">{BULAN[payment.bulan - 1]} {payment.tahun}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusIcon className="h-4 w-4" />
                <span className="font-semibold text-sm">{statusLabel}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-white/20 rounded-xl p-4 text-center">
            <p className="text-white/70 text-xs uppercase tracking-wider">Nominal Tagihan</p>
            <p className="text-3xl font-bold mt-1">{fmt(Number(payment.jumlah))}</p>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {view === "upload" ? (
            <div className="p-5 space-y-4">
              <button onClick={() => setView("detail")} className="text-sm text-primary hover:underline">← Kembali</button>
              <h3 className="font-semibold">Upload Bukti Transfer</h3>
              {preview ? (
                <div className="relative rounded-xl overflow-hidden border">
                  <Image src={preview} alt="Bukti" width={400} height={260} className="w-full object-contain max-h-56" />
                  <button onClick={() => { setPreview(null); setUploaded(null); }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5">
                    <X className="h-3 w-3" />
                  </button>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-primary hover:bg-primary/5"
                >
                  <Camera className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Pilih / Foto Bukti Transfer</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG · Maks 5MB</p>
                </button>
              )}
              <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
              <Button className="w-full" onClick={handleSaveUpload} disabled={!uploadedUrl || saving || uploading}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Kirim Bukti Transfer
              </Button>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Info tagihan */}
              <div className="divide-y rounded-xl border overflow-hidden text-sm">
                <IR Icon={Tag}          label="Jenis Iuran" value={payment.iuranType} />
                <IR Icon={CalendarDays} label="Periode"     value={`${BULAN[payment.bulan - 1]} ${payment.tahun}`} />
                <IR Icon={Receipt}      label="Frekuensi"   value={payment.periode} />
                <IR Icon={Banknote}     label="Nominal"     value={fmt(Number(payment.jumlah))} vc="font-bold text-primary" />
                {payment.status === "TERSEDIA" && (
                  <IR Icon={CalendarDays} label="Keterangan" value="Periode mendatang, bisa dibayar lebih awal mulai sekarang." />
                )}
              </div>

              {/* LUNAS */}
              {payment.status === "LUNAS" && payment.tanggalBayar && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detail Pembayaran</p>
                  <div className="divide-y rounded-xl border overflow-hidden text-sm">
                    <IR Icon={CalendarDays} label="Tanggal Bayar" value={fmtDate(payment.tanggalBayar)} />
                    <IR Icon={CreditCard}   label="Metode"        value={payment.metodeBayar ?? "—"} />
                    {mt.isMidtrans && (
                      <>
                        <div className="flex items-center gap-3 px-4 py-3">
                          <ptD.Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground w-28 shrink-0">Via</span>
                          <span className="text-sm font-medium flex items-center gap-1.5">
                            {ptD.label}
                            <Badge className="text-[10px] h-4 px-1.5 bg-blue-100 text-blue-700 hover:bg-blue-100">Online</Badge>
                          </span>
                        </div>
                        {mt.orderId && (
                          <div className="flex items-start gap-3 px-4 py-3">
                            <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <span className="text-sm text-muted-foreground w-28 shrink-0">Order ID</span>
                            <span className="text-xs font-mono text-muted-foreground break-all">{mt.orderId}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {payment.buktiUrl && !mt.isMidtrans && (
                    <div className="rounded-xl overflow-hidden border">
                      <Image src={payment.buktiUrl} alt="Bukti" width={400} height={260} className="w-full object-contain max-h-60" />
                    </div>
                  )}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-green-700">Pembayaran Dikonfirmasi</p>
                      <p className="text-xs text-green-600 mt-0.5">Lunas pada {fmtShort(payment.tanggalBayar)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* MENUNGGU */}
              {payment.status === "MENUNGGU_KONFIRMASI" && (
                <div className="space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                    <Clock className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-700">Menunggu Konfirmasi Admin</p>
                      <p className="text-xs text-yellow-600 mt-1">Bukti transfer sudah diterima. Pengurus RT akan memverifikasi segera.</p>
                    </div>
                  </div>
                  {payment.buktiUrl && (
                    <div className="rounded-xl overflow-hidden border">
                      <Image src={payment.buktiUrl} alt="Bukti" width={400} height={260} className="w-full object-contain max-h-56" />
                    </div>
                  )}
                  <Button variant="outline" className="w-full gap-2" onClick={() => setView("upload")}>
                    <Camera className="h-4 w-4" /> Ganti Bukti Transfer
                  </Button>
                </div>
              )}

              {/* BELUM BAYAR / TERSEDIA */}
              {canPayNow && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pilih Cara Bayar</p>

                  {pendingCheck ? (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <ExternalLink className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-blue-700">Halaman pembayaran sudah dibuka</p>
                            <p className="text-xs text-blue-600 mt-1">
                              Selesaikan pembayaran di tab Midtrans, lalu kembali ke sini dan klik <strong>Cek Status</strong>.
                            </p>
                          </div>
                        </div>
                        <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleCekStatus} disabled={checking}>
                          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          {checking ? "Mengecek..." : "Cek Status Pembayaran"}
                        </Button>
                      </div>
                      <Button variant="outline" className="w-full text-sm gap-2" onClick={handlePay} disabled={paying}>
                        <ExternalLink className="h-4 w-4" /> Buka Ulang Halaman Pembayaran
                      </Button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handlePay}
                        disabled={paying}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left disabled:opacity-60 group"
                      >
                        <div className="bg-blue-100 group-hover:bg-blue-200 rounded-full p-3 shrink-0">
                          {paying ? <Loader2 className="h-6 w-6 text-blue-600 animate-spin" /> : <CreditCard className="h-6 w-6 text-blue-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{paying ? "Membuka halaman pembayaran..." : "Bayar Online via Midtrans"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Transfer Bank · QRIS · GoPay · ShopeePay · OVO · Dana</p>
                          <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> Dibuka di tab baru
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-blue-300 group-hover:text-blue-500 shrink-0" />
                      </button>

                      <button
                        onClick={() => setView("upload")}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group"
                      >
                        <div className="bg-gray-100 group-hover:bg-gray-200 rounded-full p-3 shrink-0">
                          <Camera className="h-6 w-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">Upload Bukti Transfer Manual</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Transfer dulu, lalu upload foto/screenshot struk</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 shrink-0" />
                      </button>

                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">
                          Bayar online: konfirmasi <strong>otomatis</strong>. Upload bukti: perlu verifikasi admin (1–24 jam).
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Riwayat</p>
                <TL Icon={Receipt} label="Tagihan dibuat" desc={`${payment.iuranType} · ${BULAN[payment.bulan - 1]} ${payment.tahun}`} done />
                {payment.status === "MENUNGGU_KONFIRMASI" && <TL Icon={Upload} label="Bukti dikirim" desc="Menunggu verifikasi" done />}
                {payment.status === "LUNAS" && (
                  <>
                    {mt.isMidtrans
                      ? <TL Icon={CreditCard} label="Dibayar online" desc={`via ${ptD.label}`} done />
                      : payment.buktiUrl && <TL Icon={Upload} label="Bukti dikirim" done />}
                    <TL Icon={CheckCircle2} label="Dikonfirmasi lunas" desc={payment.tanggalBayar ? fmtShort(payment.tanggalBayar) : ""} done success />
                  </>
                )}
                {(payment.status === "BELUM_BAYAR" || payment.status === "TERSEDIA") && (
                  <TL Icon={CheckCircle2} label="Konfirmasi lunas" desc="Belum selesai" done={false} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IuranSayaPage() {
  return <RoleGuard allowedRoles={[UserRole.RESIDENT]}><IuranContent /></RoleGuard>;
}

function IuranContent() {
  const [data, setData]         = useState<IuranData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tahun, setTahun]       = useState(new Date().getFullYear());
  const [selected, setSelected] = useState<IuranPayment | null>(null);
  const [toast, setToast]       = useState<{ type: ToastType; message: string } | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/v1/iuran-saya?tahun=${tahun}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, [tahun]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const s = data?.summary;
  const payablePayments = (data?.payments ?? []).filter(p =>
    p.status === "BELUM_BAYAR" || p.status === "TERSEDIA",
  );

  function handleBayarSekarang() {
    const first = payablePayments.find(p => p.status === "BELUM_BAYAR") ?? payablePayments[0];
    if (first) setSelected(first);
  }

  const byType: Record<string, IuranPayment[]> = {};
  for (const p of data?.payments ?? []) {
    if (!byType[p.iuranType]) byType[p.iuranType] = [];
    byType[p.iuranType].push(p);
  }

  const statTiles = [
    { label: "Total",     value: s?.totalTagihan ?? 0,                                   note: "tagihan",               tone: "text-blue-700 bg-blue-50" },
    { label: "Lunas",     value: s?.totalLunas ?? 0,                                     note: fmt(s?.totalBayar ?? 0), tone: "text-green-700 bg-green-50" },
    { label: "Menunggu",  value: s?.totalMenunggu ?? 0,                                  note: "verifikasi",            tone: "text-yellow-700 bg-yellow-50" },
    { label: "Siap Bayar",value: (s?.totalAkanDatang ?? 0) + (s?.totalTunggakan ?? 0),   note: fmt(s?.totalBisaDibayar ?? 0), tone: "text-cyan-700 bg-cyan-50" },
    { label: "Tunggakan", value: s?.totalTunggakan ?? 0,                                 note: fmt(s?.totalHutang ?? 0),tone: "text-red-700 bg-red-50" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {selected && (
        <PaymentDetailModal
          payment={selected}
          onClose={() => setSelected(null)}
          onRefresh={fetchData}
          onToast={(t, m) => setToast({ type: t, message: m })}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Iuran Saya</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Memuat..." : `Status pembayaran iuran ${data?.warga.namaLengkap ?? ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleBayarSekarang}
            disabled={loading || payablePayments.length === 0}
            className="gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Bayar Iuran
          </Button>
          <div className="flex items-center">
            <button
              onClick={() => setTahun(y => y - 1)}
              className="px-3 py-1.5 border rounded-l-md text-sm hover:bg-gray-50 border-r-0"
            >
              ← {tahun - 1}
            </button>
            <span className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-semibold border border-primary">
              {tahun}
            </span>
            <button
              onClick={() => setTahun(y => y + 1)}
              className="px-3 py-1.5 border rounded-r-md text-sm hover:bg-gray-50 border-l-0"
            >
              {tahun + 1} →
            </button>
          </div>
        </div>
      </div>

      {/* ── Alert: tunggakan ── */}
      {!loading && (s?.totalTunggakan ?? 0) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700">{s?.totalTunggakan} tagihan belum dibayar</p>
            <p className="text-sm text-red-600 mt-0.5">
              Total: <strong>{fmt(s?.totalHutang ?? 0)}</strong> — Klik baris tagihan untuk membayar.
            </p>
          </div>
        </div>
      )}

      {/* ── Alert: akan datang ── */}
      {!loading && (s?.totalAkanDatang ?? 0) > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <CalendarDays className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-700">
              {s?.totalAkanDatang} iuran bulan depan dan seterusnya sudah siap dibayar
            </p>
            <p className="text-sm text-blue-600 mt-0.5">
              Warga bisa membayar lebih awal untuk periode mendatang, termasuk beberapa bulan ke depan.
            </p>
          </div>
        </div>
      )}

      {/* ── Stat tiles ── */}
      {loading ? (
        <div className="h-20 animate-pulse bg-gray-100 rounded-2xl" />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex overflow-x-auto [scrollbar-width:none]">
              {statTiles.map(tile => (
                <div
                  key={tile.label}
                  className={`min-w-[130px] flex-1 px-4 py-3 border-r last:border-r-0 ${tile.tone}`}
                >
                  <p className="text-[11px] uppercase tracking-wide opacity-70 font-medium">{tile.label}</p>
                  <p className="text-2xl font-bold mt-1">{tile.value}</p>
                  <p className="text-[11px] opacity-80 mt-0.5">{tile.note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Ringkasan Donut Chart ── */}
      {loading ? (
        <div className="h-52 animate-pulse bg-gray-100 rounded-2xl" />
      ) : data ? (
        <RingkasanCard
          data={data}
          tahun={tahun}
          onTahunChange={setTahun}
          onBayarSekarang={handleBayarSekarang}
        />
      ) : null}

      {/* ── Iuran Type Cards ── */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1].map(i => <div key={i} className="h-52 animate-pulse bg-gray-100 rounded-2xl" />)}
        </div>
      ) : Object.keys(byType).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Belum ada tagihan iuran untuk tahun {tahun}</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(byType).map(([typeName, payments]) => (
          <IuranTypeCard
            key={typeName}
            typeName={typeName}
            payments={payments}
            onSelect={setSelected}
          />
        ))
      )}

      {/* ── Info bar ── */}
      {!loading && (s?.totalTagihan ?? 0) > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 rounded-lg px-4 py-3 border">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Klik baris iuran untuk melihat detail dan melakukan pembayaran, termasuk untuk iuran bulan depan dan beberapa bulan berikutnya.
        </div>
      )}
    </div>
  );
}

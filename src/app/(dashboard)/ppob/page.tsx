"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Droplets,
  Smartphone,
  Heart,
  HardHat,
  Wifi,
  Tv,
  MoreHorizontal,
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  FileText,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type JenisPPOB =
  | "PLN"
  | "PDAM"
  | "PULSA"
  | "BPJS_KESEHATAN"
  | "BPJS_KETENAGAKERJAAN"
  | "INTERNET"
  | "TV_KABEL"
  | "LAINNYA";

type StatusPPOB = "MENUNGGU" | "DIPROSES" | "BERHASIL" | "GAGAL";

interface PPOBOrder {
  id: string;
  pemohon: string;
  jenis: JenisPPOB;
  nomorTujuan: string;
  jumlah: number;
  adminFee: number;
  total: number;
  status: StatusPPOB;
  catatan: string | null;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICES: {
  jenis: JenisPPOB;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  placeholder: string;
  hint: string;
}[] = [
  {
    jenis: "PLN",
    label: "Token / Tagihan PLN",
    sublabel: "Listrik rumah",
    icon: Zap,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    placeholder: "Nomor ID Pelanggan / Meter",
    hint: "Contoh: 5201020304050",
  },
  {
    jenis: "PDAM",
    label: "Tagihan PDAM",
    sublabel: "Air bersih",
    icon: Droplets,
    color: "text-blue-600",
    bg: "bg-blue-50",
    placeholder: "Nomor Pelanggan PDAM",
    hint: "Contoh: 1234567890",
  },
  {
    jenis: "PULSA",
    label: "Pulsa / Paket Data",
    sublabel: "Semua operator",
    icon: Smartphone,
    color: "text-green-600",
    bg: "bg-green-50",
    placeholder: "Nomor HP tujuan",
    hint: "Contoh: 081234567890",
  },
  {
    jenis: "BPJS_KESEHATAN",
    label: "BPJS Kesehatan",
    sublabel: "Premi JKN",
    icon: Heart,
    color: "text-red-600",
    bg: "bg-red-50",
    placeholder: "Nomor BPJS / NIK",
    hint: "Contoh: 0001234567890",
  },
  {
    jenis: "BPJS_KETENAGAKERJAAN",
    label: "BPJS Ketenagakerjaan",
    sublabel: "Jamsostek",
    icon: HardHat,
    color: "text-orange-600",
    bg: "bg-orange-50",
    placeholder: "Nomor Kepesertaan",
    hint: "Contoh: 1234567890",
  },
  {
    jenis: "INTERNET",
    label: "Internet / IndiHome",
    sublabel: "Tagihan bulanan",
    icon: Wifi,
    color: "text-purple-600",
    bg: "bg-purple-50",
    placeholder: "Nomor Pelanggan Internet",
    hint: "Contoh: 10112345678",
  },
  {
    jenis: "TV_KABEL",
    label: "TV Kabel",
    sublabel: "MNC, First Media, dll",
    icon: Tv,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    placeholder: "Nomor ID Pelanggan",
    hint: "Contoh: 987654321",
  },
  {
    jenis: "LAINNYA",
    label: "Lainnya",
    sublabel: "Tagihan lain",
    icon: MoreHorizontal,
    color: "text-gray-600",
    bg: "bg-gray-50",
    placeholder: "Nomor / ID tujuan",
    hint: "Masukkan nomor tujuan pembayaran",
  },
];

const STATUS_CONFIG: Record<StatusPPOB, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ElementType; color: string }> = {
  MENUNGGU:  { label: "Menunggu",  variant: "outline",     icon: Clock,        color: "text-yellow-600" },
  DIPROSES:  { label: "Diproses",  variant: "secondary",   icon: Loader2,      color: "text-blue-600"   },
  BERHASIL:  { label: "Berhasil",  variant: "default",     icon: CheckCircle,  color: "text-green-600"  },
  GAGAL:     { label: "Gagal",     variant: "destructive", icon: XCircle,      color: "text-red-600"    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Admin Status Update ──────────────────────────────────────────────────────

function AdminStatusRow({ order, onUpdated }: { order: PPOBOrder; onUpdated: () => void }) {
  const [open, setOpen]         = useState(false);
  const [catatan, setCatatan]   = useState(order.catatan ?? "");
  const [submitting, setSub]    = useState(false);

  async function handleUpdate(status: string) {
    setSub(true);
    try {
      const res = await fetch(`/api/v1/ppob/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, catatan }),
      });
      if ((await res.json()).success) {
        setOpen(false);
        onUpdated();
      }
    } finally {
      setSub(false);
    }
  }

  if (order.status === "BERHASIL" || order.status === "GAGAL") return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-primary hover:underline flex items-center gap-1"
      >
        Update status <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border space-y-2">
          <Input
            placeholder="Catatan (opsional)"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            className="text-xs h-8"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleUpdate("DIPROSES")} disabled={submitting || order.status === "DIPROSES"}>
              Proses
            </Button>
            <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700" onClick={() => handleUpdate("BERHASIL")} disabled={submitting}>
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Selesai"}
            </Button>
            <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => handleUpdate("GAGAL")} disabled={submitting}>
              Tolak
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Order Form ───────────────────────────────────────────────────────────────

function OrderForm({
  service,
  onSuccess,
  onBack,
}: {
  service: typeof SERVICES[0];
  onSuccess: () => void;
  onBack: () => void;
}) {
  const { data: session } = useSession();
  const [nomorTujuan, setNomor] = useState("");
  const [jumlah, setJumlah]    = useState("");
  const [submitting, setSub]   = useState(false);
  const [error, setError]      = useState("");
  const [done, setDone]        = useState(false);

  // Estimated admin fee (shown in real-time)
  const ADMIN_FEE: Record<JenisPPOB, number> = {
    PLN: 2500, PDAM: 2500, PULSA: 1500,
    BPJS_KESEHATAN: 2000, BPJS_KETENAGAKERJAAN: 2000,
    INTERNET: 2500, TV_KABEL: 2500, LAINNYA: 1000,
  };
  const fee   = ADMIN_FEE[service.jenis];
  const total = Number(jumlah || 0) + fee;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nomorTujuan || !jumlah) { setError("Semua field wajib diisi"); return; }
    if (Number(jumlah) < 1000) { setError("Jumlah minimal Rp 1.000"); return; }

    setSub(true);
    try {
      const res  = await fetch("/api/v1/ppob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenis: service.jenis,
          nomorTujuan,
          jumlah: Number(jumlah),
          pemohon: session?.user?.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        onSuccess();
      } else {
        setError(data.error || "Gagal membuat order");
      }
    } finally {
      setSub(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-10">
        <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
        <h3 className="text-xl font-bold">Order Berhasil Dikirim!</h3>
        <p className="text-muted-foreground mt-2">
          Pengurus RT akan memproses pembayaran Anda segera.
        </p>
        <Button className="mt-6" onClick={onBack}>Kembali ke Layanan</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      {/* Service header */}
      <div className={`flex items-center gap-4 p-4 rounded-xl ${service.bg}`}>
        <div className={`p-3 rounded-full bg-white/60 ${service.color}`}>
          <service.icon className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold">{service.label}</p>
          <p className="text-sm text-muted-foreground">{service.sublabel}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Nomor Tujuan</label>
          <Input
            value={nomorTujuan}
            onChange={(e) => setNomor(e.target.value)}
            placeholder={service.placeholder}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">{service.hint}</p>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Jumlah Pembayaran (Rp)</label>
          <Input
            type="number"
            min={1000}
            step={1000}
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
            placeholder="Contoh: 150000"
            required
          />
        </div>

        {/* Fee breakdown */}
        {jumlah && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jumlah tagihan</span>
              <span>{formatRupiah(Number(jumlah))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Biaya admin</span>
              <span>{formatRupiah(fee)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1 mt-1">
              <span>Total bayar</span>
              <span className="text-primary">{formatRupiah(total)}</span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

        <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
          <p className="font-medium">Cara pembayaran:</p>
          <p className="mt-1">Setelah order dibuat, hubungi pengurus RT untuk melakukan pembayaran. Pengurus akan memproses dan mengkonfirmasi.</p>
        </div>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mengirim...</>
          ) : (
            "Kirim Order"
          )}
        </Button>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PPOBPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "RT_ADMIN" || role === "SUPER_ADMIN";

  const [selected, setSelected]   = useState<typeof SERVICES[0] | null>(null);
  const [orders, setOrders]       = useState<PPOBOrder[]>([]);
  const [loadingOrders, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"layanan" | "riwayat">("layanan");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/v1/ppob?limit=50");
      const json = await res.json();
      if (json.success) setOrders(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "riwayat") fetchOrders();
  }, [activeTab, fetchOrders]);

  if (selected) {
    return (
      <div className="max-w-lg mx-auto">
        <OrderForm
          service={selected}
          onBack={() => setSelected(null)}
          onSuccess={() => {
            setSelected(null);
            setActiveTab("riwayat");
            fetchOrders();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">PPOB — Layanan Pembayaran</h1>
        <p className="text-muted-foreground">
          Bayar tagihan & top-up melalui pengurus RT
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {(["layanan", "riwayat"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab ? "bg-white shadow text-foreground" : "text-muted-foreground"
            }`}
          >
            {tab === "layanan" ? "Pilih Layanan" : "Riwayat Order"}
          </button>
        ))}
      </div>

      {/* ── Tab: Layanan ── */}
      {activeTab === "layanan" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Pilih jenis layanan yang ingin dibayarkan:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {SERVICES.map((svc) => (
              <button
                key={svc.jenis}
                onClick={() => setSelected(svc)}
                className={`group flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-transparent hover:border-primary/30 transition-all ${svc.bg} hover:shadow-md`}
              >
                <div className={`p-3 rounded-full bg-white/70 group-hover:scale-110 transition-transform ${svc.color}`}>
                  <svc.icon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold leading-tight">{svc.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{svc.sublabel}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <p className="font-medium">ℹ️ Catatan Penting</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-amber-700">
              <li>Layanan PPOB diproses secara manual oleh pengurus RT.</li>
              <li>Setelah submit, hubungi pengurus untuk konfirmasi pembayaran.</li>
              <li>Biaya admin bervariasi per jenis layanan (Rp 1.000 – Rp 2.500).</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Tab: Riwayat ── */}
      {activeTab === "riwayat" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{orders.length} order ditemukan</p>
            <Button variant="ghost" size="sm" onClick={fetchOrders} disabled={loadingOrders} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loadingOrders ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loadingOrders ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-200 mb-3" />
              <p className="text-muted-foreground">Belum ada riwayat order</p>
              <Button variant="outline" className="mt-4" onClick={() => setActiveTab("layanan")}>
                Buat Order Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const statusCfg = STATUS_CONFIG[order.status];
                const svc = SERVICES.find((s) => s.jenis === order.jenis);

                return (
                  <Card key={order.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        {svc && (
                          <div className={`p-2.5 rounded-lg ${svc.bg} ${svc.color} shrink-0`}>
                            <svc.icon className="h-5 w-5" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">{svc?.label ?? order.jenis}</p>
                              <p className="text-xs text-muted-foreground font-mono">{order.nomorTujuan}</p>
                            </div>
                            <Badge variant={statusCfg.variant} className="shrink-0 gap-1">
                              <statusCfg.icon className="h-3 w-3" />
                              {statusCfg.label}
                            </Badge>
                          </div>

                          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{formatDate(order.createdAt)}</span>
                            <span className="font-medium text-foreground">{formatRupiah(order.total)}</span>
                            {isAdmin && (
                              <span className="text-xs">{order.pemohon}</span>
                            )}
                          </div>

                          {order.catatan && (
                            <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{order.catatan}&rdquo;</p>
                          )}

                          {/* Admin controls */}
                          {isAdmin && (
                            <AdminStatusRow order={order} onUpdated={fetchOrders} />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

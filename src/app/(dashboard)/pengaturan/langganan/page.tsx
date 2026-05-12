"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Crown,
  Zap,
  Shield,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  X,
} from "lucide-react";
import { TIER_PRICES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { getTierLabel } from "@/lib/features";
import { SubscriptionTier } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────────────

type ProviderName = "MIDTRANS" | "XENDIT" | "STRIPE";

interface PaymentTx {
  id: string;
  orderId: string;
  provider: ProviderName;
  tier: SubscriptionTier;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "REFUNDED";
  paymentUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PROVIDER_INFO: Record<ProviderName, { label: string; logo: string; color: string }> = {
  MIDTRANS: { label: "Midtrans", logo: "🟠", color: "text-orange-600" },
  XENDIT:   { label: "Xendit",   logo: "🔵", color: "text-blue-600" },
  STRIPE:   { label: "Stripe",   logo: "🟣", color: "text-purple-600" },
};

const TIER_ORDER: Record<string, number> = { TIER_A: 1, TIER_B: 2, TIER_C: 3 };

const PLANS = [
  {
    tier: "TIER_A" as const,
    name: "Basic",
    icon: Shield,
    color: "text-blue-600",
    borderColor: "border-blue-200",
    bgColor: "bg-blue-50",
    featureCount: 49,
    features: [
      "Pendataan warga, rumah & keluarga",
      "Data tamu & kendaraan",
      "Surat keterangan + tanda tangan digital",
      "Keuangan & iuran bulanan",
      "Laporan cashflow",
      "Siskamling & ronda",
      "Berita & pengumuman online",
      "Saran & keluhan warga",
      "Agenda & foto galeri",
      "16 laporan informasi",
    ],
    excluded: ["Usaha/Lapak Warga", "Usulan Pembangunan", "Pos Security", "APK Ronda"],
  },
  {
    tier: "TIER_B" as const,
    name: "Standard",
    icon: Zap,
    color: "text-purple-600",
    borderColor: "border-purple-200",
    bgColor: "bg-purple-50",
    featureCount: 52,
    features: [
      "Semua fitur Basic",
      "Usaha/Lapak Warga",
      "Usulan Rencana Pembangunan",
      "APK Ronda (Android)",
    ],
    excluded: ["Pos Security"],
  },
  {
    tier: "TIER_C" as const,
    name: "Premium",
    icon: Crown,
    color: "text-amber-600",
    borderColor: "border-amber-200",
    bgColor: "bg-amber-50",
    featureCount: 53,
    features: [
      "Semua fitur Standard",
      "Pos Security",
      "Usaha Warga + Katalog Produk",
      "Prioritas support",
    ],
    excluded: [],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function StatusBadge({ status }: { status: PaymentTx["status"] }) {
  const map: Record<string, { label: string; variant: "default" | "success" | "destructive" | "secondary" | "warning" }> = {
    PAID:     { label: "Berhasil", variant: "success" },
    PENDING:  { label: "Menunggu", variant: "warning" },
    FAILED:   { label: "Gagal",    variant: "destructive" },
    EXPIRED:  { label: "Kedaluwarsa", variant: "secondary" },
    REFUNDED: { label: "Refund",   variant: "secondary" },
  };
  const info = map[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={info.variant as "default"}>{info.label}</Badge>;
}

// ─── Payment Modal ──────────────────────────────────────────────────────────

function PaymentModal({
  tier,
  providers,
  onClose,
  onSuccess,
}: {
  tier: (typeof PLANS)[0];
  providers: ProviderName[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>(providers[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tier.tier, provider: selectedProvider }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Gagal memproses pembayaran"); return; }

      // For Midtrans: can use Snap.js modal OR redirect
      // We always redirect for simplicity (works for all providers)
      window.open(data.data.paymentUrl, "_blank");
      onSuccess();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">Upgrade ke {tier.name}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-muted-foreground">Paket</span>
            <span className="font-semibold">{tier.name} ({tier.tier})</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-muted-foreground">Total / bulan</span>
            <span className="font-bold text-lg">{formatCurrency(TIER_PRICES[tier.tier].monthly)}</span>
          </div>

          {/* Provider selection */}
          {providers.length > 1 && (
            <div>
              <p className="text-sm font-medium mb-2">Metode Pembayaran</p>
              <div className="grid grid-cols-3 gap-2">
                {providers.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedProvider(p)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors text-sm font-medium ${
                      selectedProvider === p
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-xl">{PROVIDER_INFO[p].logo}</span>
                    <span className={selectedProvider === p ? "text-primary" : "text-muted-foreground"}>
                      {PROVIDER_INFO[p].label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {providers.length === 1 && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-muted-foreground">Pembayaran via</span>
              <span className="font-medium">{PROVIDER_INFO[providers[0]].logo} {PROVIDER_INFO[providers[0]].label}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Anda akan diarahkan ke halaman pembayaran {PROVIDER_INFO[selectedProvider]?.label ?? selectedProvider}.
            Setelah pembayaran berhasil, langganan akan aktif otomatis.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button className="flex-1" onClick={handlePay} disabled={loading}>
            {loading ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Memproses...</>
            ) : (
              <><CreditCard className="h-4 w-4 mr-2" /> Bayar Sekarang</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function LanggananPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const currentTier = (session?.user?.tier as SubscriptionTier) ?? "TIER_A";

  const [providers, setProviders] = useState<ProviderName[]>([]);
  const [transactions, setTransactions] = useState<PaymentTx[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<(typeof PLANS)[0] | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"success" | "failed" | null>(null);

  // Read query params set by payment provider redirect
  useEffect(() => {
    const ps = searchParams.get("payment");
    if (ps === "success") setPaymentStatus("success");
    else if (ps === "failed") setPaymentStatus("failed");
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    const [provRes, txRes] = await Promise.all([
      fetch("/api/v1/payment/checkout"),
      fetch("/api/v1/payment/transactions"),
    ]);
    if (provRes.ok) {
      const d = await provRes.json();
      setProviders(d.data?.providers ?? []);
    }
    if (txRes.ok) {
      const d = await txRes.json();
      setTransactions(d.data ?? []);
    }
    setLoadingTx(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Langganan</h1>
        <p className="text-muted-foreground">
          Paket aktif:{" "}
          <span className="font-semibold text-primary">{getTierLabel(currentTier)}</span>
        </p>
      </div>

      {/* Payment result banners */}
      {paymentStatus === "success" && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Pembayaran berhasil!</p>
            <p className="text-sm">Langganan Anda sedang diproses. Refresh halaman dalam beberapa menit.</p>
          </div>
        </div>
      )}
      {paymentStatus === "failed" && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Pembayaran dibatalkan atau gagal.</p>
            <p className="text-sm">Silakan coba lagi atau pilih metode pembayaran lain.</p>
          </div>
        </div>
      )}

      {/* No provider warning */}
      {!loadingTx && providers.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Payment gateway belum dikonfigurasi</p>
            <p className="text-sm mt-0.5">
              Tambahkan <code className="bg-amber-100 px-1 rounded text-xs">MIDTRANS_SERVER_KEY</code>,{" "}
              <code className="bg-amber-100 px-1 rounded text-xs">XENDIT_SECRET_KEY</code>, atau{" "}
              <code className="bg-amber-100 px-1 rounded text-xs">STRIPE_SECRET_KEY</code> ke file{" "}
              <code className="bg-amber-100 px-1 rounded text-xs">.env</code> untuk mengaktifkan pembayaran.
            </p>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const isUpgrade = TIER_ORDER[plan.tier] > TIER_ORDER[currentTier];
          const Icon = plan.icon;

          return (
            <Card
              key={plan.tier}
              className={`relative flex flex-col transition-shadow ${
                isCurrent
                  ? "border-primary shadow-md ring-1 ring-primary"
                  : isUpgrade
                  ? "hover:shadow-md"
                  : "opacity-70"
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="shadow-sm">Paket Aktif</Badge>
                </div>
              )}

              <CardHeader className="pb-2">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${plan.bgColor} mb-2`}>
                  <Icon className={`h-5 w-5 ${plan.color}`} />
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="mt-1">
                  <span className="text-3xl font-bold">
                    {formatCurrency(TIER_PRICES[plan.tier].monthly)}
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">/bulan</span>
                </div>
                <p className="text-xs text-muted-foreground">{plan.featureCount} fitur tersedia</p>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-1.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.excluded.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground line-through">
                      <X className="h-4 w-4 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    Paket Aktif
                  </Button>
                ) : isUpgrade ? (
                  <Button
                    className="w-full"
                    onClick={() => setSelectedPlan(plan)}
                    disabled={providers.length === 0}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Upgrade ke {plan.name}
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Downgrade tidak tersedia
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Available payment methods */}
      {providers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Metode Pembayaran Tersedia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {providers.map((p) => (
                <div
                  key={p}
                  className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-gray-50"
                >
                  <span className="text-lg">{PROVIDER_INFO[p].logo}</span>
                  <div>
                    <p className={`text-sm font-medium ${PROVIDER_INFO[p].color}`}>
                      {PROVIDER_INFO[p].label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p === "MIDTRANS" && "Transfer, e-wallet, kartu kredit"}
                      {p === "XENDIT"   && "Transfer bank, OVO, DANA, dan lainnya"}
                      {p === "STRIPE"   && "Kartu kredit / debit internasional"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Riwayat Pembayaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTx ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Belum ada riwayat pembayaran
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Tanggal</th>
                    <th className="text-left py-2 px-2 font-medium hidden sm:table-cell">Order ID</th>
                    <th className="text-left py-2 px-2 font-medium">Paket</th>
                    <th className="text-left py-2 px-2 font-medium hidden md:table-cell">Via</th>
                    <th className="text-right py-2 px-2 font-medium">Jumlah</th>
                    <th className="text-center py-2 px-2 font-medium">Status</th>
                    <th className="py-2 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2.5 px-2 text-muted-foreground whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-xs text-muted-foreground hidden sm:table-cell">
                        {tx.orderId}
                      </td>
                      <td className="py-2.5 px-2 font-medium">
                        {getTierLabel(tx.tier as SubscriptionTier)}
                      </td>
                      <td className="py-2.5 px-2 hidden md:table-cell">
                        <span className="flex items-center gap-1">
                          <span>{PROVIDER_INFO[tx.provider]?.logo ?? "💳"}</span>
                          <span className="text-muted-foreground">
                            {PROVIDER_INFO[tx.provider]?.label ?? tx.provider}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium">
                        {formatCurrency(Number(tx.amount))}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="py-2.5 px-2">
                        {tx.status === "PENDING" && tx.paymentUrl && (
                          <a
                            href={tx.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            Bayar <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment modal */}
      {selectedPlan && (
        <PaymentModal
          tier={selectedPlan}
          providers={providers}
          onClose={() => setSelectedPlan(null)}
          onSuccess={() => {
            setSelectedPlan(null);
            setTimeout(fetchData, 2000); // Refresh tx list after short delay
          }}
        />
      )}
    </div>
  );
}

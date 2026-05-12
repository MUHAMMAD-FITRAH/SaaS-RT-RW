"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Banknote,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Play,
  Ban,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getTierLabel } from "@/lib/features";
import { SubscriptionTier } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────────────

type TxStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "REFUNDED";
type ProviderName = "MIDTRANS" | "XENDIT" | "STRIPE" | "MANUAL";

interface PaymentTx {
  id: string;
  orderId: string;
  provider: ProviderName;
  tier: SubscriptionTier;
  amount: number;
  currency: string;
  status: TxStatus;
  paymentUrl: string | null;
  paidAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  tenant: { id: string; name: string; slug: string; rtNumber: string; rwNumber: string };
}

interface StatGroup {
  status: TxStatus;
  _count: { id: number };
  _sum: { amount: string | null };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PROVIDER_INFO: Record<ProviderName, { label: string; logo: string }> = {
  MIDTRANS: { label: "Midtrans", logo: "🟠" },
  XENDIT:   { label: "Xendit",   logo: "🔵" },
  STRIPE:   { label: "Stripe",   logo: "🟣" },
  MANUAL:   { label: "Manual",   logo: "📋" },
};

const STATUS_CONFIG: Record<TxStatus, { label: string; variant: string; icon: React.ElementType }> = {
  PAID:     { label: "Berhasil",      variant: "success",     icon: CheckCircle2 },
  PENDING:  { label: "Menunggu",      variant: "warning",     icon: Clock },
  FAILED:   { label: "Gagal",         variant: "destructive", icon: XCircle },
  EXPIRED:  { label: "Kedaluwarsa",   variant: "secondary",   icon: XCircle },
  REFUNDED: { label: "Dikembalikan",  variant: "secondary",   icon: RefreshCw },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<PaymentTx[]>([]);
  const [stats, setStats] = useState<StatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      ...(search         ? { search }                   : {}),
      ...(filterStatus   ? { status: filterStatus }     : {}),
      ...(filterProvider ? { provider: filterProvider } : {}),
    });

    const res = await fetch(`/api/v1/admin/payments?${params}`);
    const d = await res.json();
    if (d.success) {
      setTransactions(d.data.transactions ?? []);
      setMeta(d.data.meta ?? { total: 0, totalPages: 0 });
      setStats(d.data.meta?.stats ?? []);
    }
    setLoading(false);
  }, [page, search, filterStatus, filterProvider]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAction(orderId: string, action: "activate" | "cancel") {
    const label = action === "activate" ? "aktifkan langganan" : "batalkan";
    if (!confirm(`Yakin ingin ${label} transaksi ini?`)) return;

    setActionLoading(orderId);
    const res = await fetch("/api/v1/admin/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, action }),
    });
    setActionLoading(null);

    if (res.ok) {
      fetchData();
    } else {
      const d = await res.json();
      alert(d.error ?? "Gagal memproses aksi");
    }
  }

  // Computed stats
  const totalRevenue = stats
    .filter((s) => s.status === "PAID")
    .reduce((sum, s) => sum + Number(s._sum.amount ?? 0), 0);
  const totalPaid    = stats.find((s) => s.status === "PAID")?._count.id    ?? 0;
  const totalPending = stats.find((s) => s.status === "PENDING")?._count.id ?? 0;
  const totalFailed  = (stats.find((s) => s.status === "FAILED")?._count.id  ?? 0)
                     + (stats.find((s) => s.status === "EXPIRED")?._count.id ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="h-6 w-6 text-primary" /> Manajemen Pembayaran
        </h1>
        <p className="text-muted-foreground">Monitor dan kelola semua transaksi pembayaran langganan</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Pendapatan"
          value={formatCurrency(totalRevenue)}
          sub={`dari ${totalPaid} transaksi berhasil`}
          icon={Banknote}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Berhasil"
          value={totalPaid.toString()}
          sub="transaksi lunas"
          icon={CheckCircle2}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Menunggu"
          value={totalPending.toString()}
          sub="perlu konfirmasi"
          icon={Clock}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          title="Gagal / Expired"
          value={totalFailed.toString()}
          sub="tidak berhasil"
          icon={XCircle}
          color="bg-red-100 text-red-600"
        />
      </div>

      {/* Filters + Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <CardTitle className="text-base">Semua Transaksi ({meta.total})</CardTitle>
            <div className="flex flex-wrap gap-2">
              {/* Search */}
              <form
                onSubmit={(e) => { e.preventDefault(); setPage(1); fetchData(); }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Cari nama RT/tenant..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-48"
                />
                <Button type="submit" variant="secondary" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </form>

              {/* Provider filter */}
              <Select
                value={filterProvider}
                onChange={(e) => { setFilterProvider(e.target.value); setPage(1); }}
                className="w-36"
              >
                <option value="">Semua Provider</option>
                <option value="MIDTRANS">Midtrans</option>
                <option value="XENDIT">Xendit</option>
                <option value="STRIPE">Stripe</option>
                <option value="MANUAL">Manual</option>
              </Select>

              {/* Status filter */}
              <Select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="w-36"
              >
                <option value="">Semua Status</option>
                <option value="PAID">Berhasil</option>
                <option value="PENDING">Menunggu</option>
                <option value="FAILED">Gagal</option>
                <option value="EXPIRED">Kedaluwarsa</option>
              </Select>

              <Button variant="outline" size="icon" onClick={fetchData} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Tidak ada transaksi ditemukan
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Tanggal</th>
                      <th className="text-left py-3 px-2 font-medium">Tenant</th>
                      <th className="text-left py-3 px-2 font-medium hidden lg:table-cell">Order ID</th>
                      <th className="text-left py-3 px-2 font-medium">Paket</th>
                      <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Provider</th>
                      <th className="text-right py-3 px-2 font-medium">Jumlah</th>
                      <th className="text-center py-3 px-2 font-medium">Status</th>
                      <th className="text-center py-3 px-2 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const statusCfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.FAILED;
                      const Icon = statusCfg.icon;
                      const isLoading = actionLoading === tx.orderId;

                      return (
                        <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-3 px-2 text-muted-foreground whitespace-nowrap text-xs">
                            {formatDate(tx.createdAt)}
                          </td>
                          <td className="py-3 px-2">
                            <p className="font-medium">{tx.tenant.name}</p>
                            <p className="text-xs text-muted-foreground">
                              RT {tx.tenant.rtNumber} / RW {tx.tenant.rwNumber}
                            </p>
                          </td>
                          <td className="py-3 px-2 hidden lg:table-cell font-mono text-xs text-muted-foreground">
                            {tx.orderId}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant="outline">
                              {getTierLabel(tx.tier as SubscriptionTier)}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 hidden md:table-cell">
                            <span className="flex items-center gap-1 text-sm">
                              <span>{PROVIDER_INFO[tx.provider]?.logo ?? "💳"}</span>
                              <span className="text-muted-foreground">
                                {PROVIDER_INFO[tx.provider]?.label ?? tx.provider}
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right font-medium whitespace-nowrap">
                            {formatCurrency(Number(tx.amount))}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Badge
                              variant={statusCfg.variant as "default"}
                              className="gap-1"
                            >
                              <Icon className="h-3 w-3" />
                              {statusCfg.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-center gap-1">
                              {/* Activate manually */}
                              {(tx.status === "PENDING" || tx.status === "FAILED" || tx.status === "EXPIRED") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                  disabled={isLoading}
                                  onClick={() => handleAction(tx.orderId, "activate")}
                                  title="Aktifkan langganan secara manual"
                                >
                                  {isLoading ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Play className="h-3 w-3 mr-1" />
                                  )}
                                  Aktifkan
                                </Button>
                              )}

                              {/* Cancel pending */}
                              {tx.status === "PENDING" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                                  disabled={isLoading}
                                  onClick={() => handleAction(tx.orderId, "cancel")}
                                  title="Batalkan transaksi"
                                >
                                  <Ban className="h-3 w-3 mr-1" />
                                  Batal
                                </Button>
                              )}

                              {/* Open payment URL */}
                              {tx.status === "PENDING" && tx.paymentUrl && (
                                <a
                                  href={tx.paymentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline px-1"
                                >
                                  Link
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Halaman {page} dari {meta.totalPages} · Total {meta.total} transaksi
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

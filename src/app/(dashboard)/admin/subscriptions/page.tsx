"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import { CreditCard, Search, Edit2, CheckCircle } from "lucide-react";

interface SubscriptionItem {
  id: string;
  tier: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  tenant: { id: string; name: string; slug: string; isActive: boolean };
}

const TIER_LABEL: Record<string, string> = { TIER_A: "Sistem A", TIER_B: "Sistem B", TIER_C: "Sistem C" };
const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  TRIALING: "secondary",
  PAST_DUE: "destructive",
  CANCELED: "outline",
};

export default function AdminSubscriptionsPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
      <SubscriptionsContent />
    </RoleGuard>
  );
}

function SubscriptionsContent() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ tier: "", status: "" });

  const loadData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("limit", "50");

    fetch(`/api/v1/admin/subscriptions?${params}`)
      .then((res) => res.json())
      .then((data) => { if (data.success) setSubscriptions(data.data); })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleUpdate(subId: string) {
    await fetch("/api/v1/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId: subId, ...editData }),
    });
    setEditingId(null);
    loadData();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">Kelola Langganan</h1>
          <Badge variant="destructive">Super Admin</Badge>
        </div>
        <p className="text-muted-foreground">Kelola tier & status langganan semua tenant</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari tenant..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Subscription List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-20 animate-pulse bg-gray-200 rounded" /></CardContent></Card>
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium">Belum ada langganan</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{sub.tenant.name}</span>
                      <Badge variant={STATUS_BADGE[sub.status] || "outline"} className="text-xs">
                        {sub.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {TIER_LABEL[sub.tier] || sub.tier}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Slug: {sub.tenant.slug}</span>
                      {sub.currentPeriodEnd && <span>Periode: s.d. {new Date(sub.currentPeriodEnd).toLocaleDateString("id-ID")}</span>}
                      {sub.trialEndsAt && <span>Trial: s.d. {new Date(sub.trialEndsAt).toLocaleDateString("id-ID")}</span>}
                      <span>Dibuat: {new Date(sub.createdAt).toLocaleDateString("id-ID")}</span>
                    </div>

                    {editingId === sub.id && (
                      <div className="flex gap-3 mt-3 items-end">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Tier</label>
                          <Select className="w-32 h-8" value={editData.tier} onChange={(e) => setEditData({ ...editData, tier: e.target.value })}>
                            <option value="TIER_A">Sistem A</option>
                            <option value="TIER_B">Sistem B</option>
                            <option value="TIER_C">Sistem C</option>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Status</label>
                          <Select className="w-32 h-8" value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })}>
                            <option value="ACTIVE">Active</option>
                            <option value="TRIALING">Trialing</option>
                            <option value="PAST_DUE">Past Due</option>
                            <option value="CANCELED">Canceled</option>
                          </Select>
                        </div>
                        <Button size="sm" onClick={() => handleUpdate(sub.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Simpan
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Batal</Button>
                      </div>
                    )}
                  </div>

                  <Button size="sm" variant="outline" onClick={() => {
                    setEditingId(sub.id);
                    setEditData({ tier: sub.tier, status: sub.status });
                  }}>
                    <Edit2 className="h-3 w-3 mr-1" /> Ubah
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

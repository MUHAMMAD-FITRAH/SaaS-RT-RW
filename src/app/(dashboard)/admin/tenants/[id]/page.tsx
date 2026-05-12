"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import {
  ArrowLeft,
  Building2,
  Users,
  Home,
  CreditCard,
  Save,
  Power,
  Shield,
} from "lucide-react";

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  rtNumber: string;
  rwNumber: string;
  kelurahan: string | null;
  kecamatan: string | null;
  kota: string | null;
  provinsi: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  subscription: {
    id: string;
    tier: string;
    status: string;
    startDate: string;
    endDate: string | null;
  } | null;
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
  }[];
  _count: {
    warga: number;
    rumah: number;
    keluarga: number;
  };
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  RT_ADMIN: "Admin RT",
  RW_ADMIN: "Admin RW",
  RESIDENT: "Warga",
};

const tierLabels: Record<string, string> = {
  TIER_A: "Plan A (Basic)",
  TIER_B: "Plan B (Standard)",
  TIER_C: "Plan C (Premium)",
};

export default function TenantDetailPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
      <TenantDetailContent />
    </RoleGuard>
  );
}

function TenantDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    fetch(`/api/v1/admin/tenants/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setTenant(d.data);
          setEditForm({
            name: d.data.name || "",
            phone: d.data.phone || "",
            email: d.data.email || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/v1/admin/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (data.success) {
      setTenant((prev) => (prev ? { ...prev, ...editForm } : prev));
      setEditing(false);
      setMessage("Berhasil disimpan");
    } else {
      setMessage("Gagal menyimpan");
    }
    setSaving(false);
  }

  async function toggleActive() {
    if (!tenant) return;
    const res = await fetch(`/api/v1/admin/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !tenant.isActive }),
    });
    const data = await res.json();
    if (data.success) {
      setTenant((prev) => (prev ? { ...prev, isActive: !prev.isActive } : prev));
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse bg-gray-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-muted-foreground">Tenant tidak ditemukan</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/tenants")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2" onClick={() => router.push("/admin/tenants")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{tenant.name}</h1>
            <Badge variant={tenant.isActive ? "default" : "destructive"}>
              {tenant.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            RT {tenant.rtNumber} / RW {tenant.rwNumber}
            {tenant.kelurahan && ` - ${tenant.kelurahan}`}
            {tenant.kota && `, ${tenant.kota}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={tenant.isActive ? "destructive" : "default"}
            size="sm"
            onClick={toggleActive}
          >
            <Power className="h-4 w-4 mr-1" />
            {tenant.isActive ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      </div>

      {message && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded">{message}</div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User</p>
              <p className="text-xl font-bold">{tenant.users.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Warga</p>
              <p className="text-xl font-bold">{tenant._count.warga}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Home className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rumah</p>
              <p className="text-xl font-bold">{tenant._count.rumah}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Paket</p>
              <p className="text-lg font-bold">
                {tenant.subscription ? tierLabels[tenant.subscription.tier] || tenant.subscription.tier : "Belum ada"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Informasi Tenant
            </CardTitle>
            <Button
              size="sm"
              variant={editing ? "outline" : "default"}
              onClick={() => setEditing(!editing)}
            >
              {editing ? "Batal" : "Edit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nama Tenant</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telepon</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Slug:</span>{" "}
                <span className="font-medium">{tenant.slug}</span>
              </div>
              <div>
                <span className="text-muted-foreground">RT/RW:</span>{" "}
                <span className="font-medium">
                  RT {tenant.rtNumber} / RW {tenant.rwNumber}
                </span>
              </div>
              {tenant.kelurahan && (
                <div>
                  <span className="text-muted-foreground">Kelurahan:</span>{" "}
                  <span className="font-medium">{tenant.kelurahan}</span>
                </div>
              )}
              {tenant.kecamatan && (
                <div>
                  <span className="text-muted-foreground">Kecamatan:</span>{" "}
                  <span className="font-medium">{tenant.kecamatan}</span>
                </div>
              )}
              {tenant.kota && (
                <div>
                  <span className="text-muted-foreground">Kota:</span>{" "}
                  <span className="font-medium">{tenant.kota}</span>
                </div>
              )}
              {tenant.provinsi && (
                <div>
                  <span className="text-muted-foreground">Provinsi:</span>{" "}
                  <span className="font-medium">{tenant.provinsi}</span>
                </div>
              )}
              {tenant.address && (
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Alamat:</span>{" "}
                  <span className="font-medium">{tenant.address}</span>
                </div>
              )}
              {tenant.phone && (
                <div>
                  <span className="text-muted-foreground">Telepon:</span>{" "}
                  <span className="font-medium">{tenant.phone}</span>
                </div>
              )}
              {tenant.email && (
                <div>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="font-medium">{tenant.email}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Dibuat:</span>{" "}
                <span className="font-medium">
                  {new Date(tenant.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription */}
      {tenant.subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Langganan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Paket:</span>{" "}
                <Badge variant="secondary">
                  {tierLabels[tenant.subscription.tier] || tenant.subscription.tier}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <Badge
                  variant={
                    tenant.subscription.status === "ACTIVE"
                      ? "default"
                      : tenant.subscription.status === "TRIAL"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {tenant.subscription.status}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Mulai:</span>{" "}
                <span className="font-medium">
                  {new Date(tenant.subscription.startDate).toLocaleDateString("id-ID")}
                </span>
                {tenant.subscription.endDate && (
                  <>
                    {" - "}
                    <span className="font-medium">
                      {new Date(tenant.subscription.endDate).toLocaleDateString("id-ID")}
                    </span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Daftar User ({tenant.users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada user</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Nama</th>
                    <th className="text-left py-2 px-2 font-medium">Email</th>
                    <th className="text-left py-2 px-2 font-medium">Role</th>
                    <th className="text-left py-2 px-2 font-medium">Status</th>
                    <th className="text-left py-2 px-2 font-medium hidden sm:table-cell">Login Terakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {tenant.users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium">{user.name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{user.email}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs">
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">
                        <Badge
                          variant={user.isActive ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {user.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 hidden sm:table-cell text-muted-foreground">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString("id-ID")
                          : "-"}
                      </td>
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

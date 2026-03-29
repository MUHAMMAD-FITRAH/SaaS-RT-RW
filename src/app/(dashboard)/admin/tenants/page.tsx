"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import { Server, Search, Plus, Users, Home, Eye, Power } from "lucide-react";

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  rtNumber: string;
  rwNumber: string;
  kelurahan: string | null;
  kota: string | null;
  isActive: boolean;
  createdAt: string;
  subscription: { tier: string; status: string } | null;
  _count: { users: number; warga: number; rumah: number };
}

export default function AdminTenantsPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
      <TenantsContent />
    </RoleGuard>
  );
}

function TenantsContent() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Form
  const [formData, setFormData] = useState({ name: "", slug: "", rtNumber: "", rwNumber: "", kelurahan: "", kecamatan: "", kota: "", provinsi: "" });

  const loadTenants = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("limit", "50");

    fetch(`/api/v1/admin/tenants?${params}`)
      .then((res) => res.json())
      .then((data) => { if (data.success) setTenants(data.data); })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setShowForm(false);
      setFormData({ name: "", slug: "", rtNumber: "", rwNumber: "", kelurahan: "", kecamatan: "", kota: "", provinsi: "" });
      loadTenants();
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/v1/admin/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    loadTenants();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">Kelola Tenant</h1>
            <Badge variant="destructive">Super Admin</Badge>
          </div>
          <p className="text-muted-foreground">Kelola semua tenant (RT/RW) di platform</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Tenant
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari tenant..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-base">Tambah Tenant Baru</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Tenant</label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="RT 001 RW 005 Kel. XXX" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Slug</label>
                <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="rt001-rw005-xxx" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">No. RT</label>
                <Input value={formData.rtNumber} onChange={(e) => setFormData({ ...formData, rtNumber: e.target.value })} placeholder="001" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">No. RW</label>
                <Input value={formData.rwNumber} onChange={(e) => setFormData({ ...formData, rwNumber: e.target.value })} placeholder="005" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kelurahan</label>
                <Input value={formData.kelurahan} onChange={(e) => setFormData({ ...formData, kelurahan: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kota</label>
                <Input value={formData.kota} onChange={(e) => setFormData({ ...formData, kota: e.target.value })} />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit">Simpan</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tenant List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-20 animate-pulse bg-gray-200 rounded" /></CardContent></Card>
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium">Belum ada tenant</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {tenants.map((tenant) => (
            <Card key={tenant.id} className={!tenant.isActive ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-lg">{tenant.name}</span>
                      <Badge variant={tenant.isActive ? "default" : "destructive"} className="text-xs">
                        {tenant.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                      {tenant.subscription && (
                        <Badge variant="secondary" className="text-xs">
                          {tenant.subscription.tier} - {tenant.subscription.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>RT {tenant.rtNumber} / RW {tenant.rwNumber}</span>
                      {tenant.kelurahan && <span>{tenant.kelurahan}</span>}
                      {tenant.kota && <span>{tenant.kota}</span>}
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {tenant._count.users} user</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {tenant._count.warga} warga</span>
                      <span className="flex items-center gap-1"><Home className="h-3 w-3" /> {tenant._count.rumah} rumah</span>
                      <span>Dibuat: {new Date(tenant.createdAt).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => window.location.href = `/admin/tenants/${tenant.id}`}>
                      <Eye className="h-3 w-3 mr-1" /> Detail
                    </Button>
                    <Button size="sm" variant={tenant.isActive ? "destructive" : "default"} onClick={() => toggleActive(tenant.id, tenant.isActive)}>
                      <Power className="h-3 w-3 mr-1" /> {tenant.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

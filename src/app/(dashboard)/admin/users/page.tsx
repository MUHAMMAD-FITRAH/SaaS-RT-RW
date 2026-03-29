"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import { getRoleLabel } from "@/lib/permissions";
import { Users, Search, Plus, Power, Edit2, UserCheck } from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  tenant: { id: string; name: string } | null;
}

const ROLE_BADGE: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  SUPER_ADMIN: "destructive",
  RT_ADMIN: "secondary",
  RW_ADMIN: "default",
  RESIDENT: "outline",
};

export default function AdminUsersPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
      <UsersContent />
    </RoleGuard>
  );
}

function UsersContent() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState({ email: "", password: "", name: "", phone: "", role: "RESIDENT", tenantId: "" });
  const [editData, setEditData] = useState({ role: "", isActive: true });

  const loadUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    params.set("limit", "100");

    fetch(`/api/v1/admin/users?${params}`)
      .then((res) => res.json())
      .then((data) => { if (data.success) setUsers(data.data); })
      .finally(() => setLoading(false));
  }, [search, roleFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setShowForm(false);
      setFormData({ email: "", password: "", name: "", phone: "", role: "RESIDENT", tenantId: "" });
      loadUsers();
    }
  }

  async function handleEdit(id: string) {
    await fetch(`/api/v1/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    setEditingId(null);
    loadUsers();
  }

  async function toggleActive(id: string, isActive: boolean) {
    if (isActive) {
      await fetch(`/api/v1/admin/users/${id}`, { method: "DELETE" });
    } else {
      await fetch(`/api/v1/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
    }
    loadUsers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">Semua User</h1>
            <Badge variant="destructive">Super Admin</Badge>
          </div>
          <p className="text-muted-foreground">Kelola semua akun pengguna di seluruh tenant</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Tambah User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama atau email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          {["", "SUPER_ADMIN", "RT_ADMIN", "RW_ADMIN", "RESIDENT"].map((r) => (
            <Button key={r} variant={roleFilter === r ? "default" : "outline"} size="sm" onClick={() => setRoleFilter(r)}>
              {r ? getRoleLabel(r as UserRole) : "Semua"}
            </Button>
          ))}
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-base">Tambah User Baru</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama</label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Telepon</label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                  <option value="SUPER_ADMIN">Admin Server</option>
                  <option value="RT_ADMIN">Admin RT</option>
                  <option value="RW_ADMIN">Admin RW/Lurah</option>
                  <option value="RESIDENT">Warga</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tenant ID (opsional)</label>
                <Input value={formData.tenantId} onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })} placeholder="Kosongkan jika SUPER_ADMIN" />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit">Simpan</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* User List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-16 animate-pulse bg-gray-200 rounded" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id} className={!user.isActive ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{user.name}</span>
                      <Badge variant={ROLE_BADGE[user.role] || "outline"} className="text-xs">
                        {getRoleLabel(user.role as UserRole)}
                      </Badge>
                      {!user.isActive && <Badge variant="destructive" className="text-xs">Nonaktif</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{user.email}</span>
                      {user.phone && <span>{user.phone}</span>}
                      {user.tenant && <span>Tenant: {user.tenant.name}</span>}
                      <span>Login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("id-ID") : "Belum pernah"}</span>
                    </div>

                    {editingId === user.id && (
                      <div className="flex gap-3 mt-3 items-end">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Role</label>
                          <Select className="w-40 h-8" value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })}>
                            <option value="SUPER_ADMIN">Admin Server</option>
                            <option value="RT_ADMIN">Admin RT</option>
                            <option value="RW_ADMIN">Admin RW/Lurah</option>
                            <option value="RESIDENT">Warga</option>
                          </Select>
                        </div>
                        <Button size="sm" onClick={() => handleEdit(user.id)}>Simpan</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Batal</Button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingId(user.id);
                      setEditData({ role: user.role, isActive: user.isActive });
                    }}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant={user.isActive ? "destructive" : "default"} onClick={() => toggleActive(user.id, user.isActive)}>
                      <Power className="h-3 w-3" />
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

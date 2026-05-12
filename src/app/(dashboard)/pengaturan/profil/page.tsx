"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import { getRoleLabel } from "@/lib/permissions";
import {
  Settings, User, Shield, Building2, Save, Camera,
  Plus, Pencil, Trash2, Phone, Image as ImageIcon,
  CheckCircle, X, GripVertical, Loader2,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TenantInfo {
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
  logo: string | null;
}

interface Pengurus {
  id: string;
  nama: string;
  jabatan: string;
  nomorHP: string | null;
  periode: string | null;
  foto: string | null;
  urutan: number;
  isActive: boolean;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

// ─── Pengurus form (add / edit) ────────────────────────────────────────────────

function PengurusForm({
  initial,
  urutan,
  onSave,
  onCancel,
}: {
  initial?: Pengurus;
  urutan: number;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    nama:    initial?.nama    ?? "",
    jabatan: initial?.jabatan ?? "",
    nomorHP: initial?.nomorHP ?? "",
    periode: initial?.periode ?? "",
    urutan:  initial?.urutan  ?? urutan,
  });
  const [foto, setFoto]   = useState(initial?.foto ?? "");
  const [saving, setSaving] = useState(false);
  const fotoRef           = useRef<HTMLInputElement>(null);

  async function uploadFoto(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "organisasi");
    const res  = await fetch("/api/v1/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json.success) setFoto(json.url);
  }

  async function save() {
    if (!form.nama || !form.jabatan) return;
    setSaving(true);

    const payload = { ...form, foto: foto || null, urutan: Number(form.urutan) };

    if (initial) {
      await fetch(`/api/v1/organisasi/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/v1/organisasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    onSave();
  }

  return (
    <div className="border rounded-xl p-4 bg-blue-50/30 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Foto */}
        <div className="sm:col-span-2 flex items-center gap-3">
          <div className="relative w-14 h-14 shrink-0">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white shadow" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <button
              onClick={() => fotoRef.current?.click()}
              className="absolute -bottom-1 -right-1 bg-white border rounded-full p-1 shadow hover:bg-gray-50"
            >
              <Camera className="h-3 w-3 text-gray-500" />
            </button>
          </div>
          <input ref={fotoRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) uploadFoto(e.target.files[0]); }}
          />
          <div className="flex-1 space-y-1.5">
            <Input
              placeholder="Nama lengkap *"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
            />
            <Input
              placeholder="Jabatan *"
              value={form.jabatan}
              onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
            />
          </div>
        </div>

        <Input
          placeholder="Nomor HP"
          value={form.nomorHP}
          onChange={(e) => setForm({ ...form, nomorHP: e.target.value })}
        />
        <Input
          placeholder="Periode (cth: 2024–2026)"
          value={form.periode}
          onChange={(e) => setForm({ ...form, periode: e.target.value })}
        />
        <div>
          <label className="text-xs text-muted-foreground">Urutan tampil</label>
          <Input
            type="number"
            value={form.urutan}
            onChange={(e) => setForm({ ...form, urutan: parseInt(e.target.value) || 0 })}
            className="mt-0.5"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving || !form.nama || !form.jabatan}>
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
          {initial ? "Simpan Perubahan" : "Tambah Pengurus"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Batal</Button>
      </div>
    </div>
  );
}

// ─── Pengurus card ─────────────────────────────────────────────────────────────

function PengurusCard({
  p,
  onEdit,
  onDelete,
}: {
  p: Pengurus;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 border rounded-xl ${!p.isActive ? "opacity-50" : ""}`}>
      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" />

      {/* Avatar */}
      {p.foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.foto} alt={p.nama} className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">
            {p.nama.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{p.nama}</p>
        <p className="text-xs text-muted-foreground truncate">{p.jabatan}</p>
        {(p.nomorHP || p.periode) && (
          <p className="text-[11px] text-muted-foreground/70">
            {p.nomorHP && <span className="mr-2">📞 {p.nomorHP}</span>}
            {p.periode && <span>📅 {p.periode}</span>}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button
          size="sm" variant="ghost"
          className="h-7 w-7 p-0 text-red-400 hover:text-red-500 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Page guard ────────────────────────────────────────────────────────────────

export default function PengaturanProfilPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RT_ADMIN, UserRole.SUPER_ADMIN]}>
      <ProfilContent />
    </RoleGuard>
  );
}

// ─── Main content ──────────────────────────────────────────────────────────────

function ProfilContent() {
  const { data: session, update: updateSession } = useSession();
  const role = (session?.user?.role as UserRole) ?? "RT_ADMIN";

  // Account state
  const [accForm, setAccForm] = useState({ name: session?.user?.name ?? "", phone: "" });
  const [avatar, setAvatar]   = useState("");
  const [accSaving, setAccSaving] = useState(false);
  const [accMsg, setAccMsg]   = useState("");
  const avatarRef             = useRef<HTMLInputElement>(null);

  // Tenant state
  const [tenant, setTenant]   = useState<TenantInfo | null>(null);
  const [tenForm, setTenForm] = useState<Partial<TenantInfo>>({});
  const [logo, setLogo]       = useState("");
  const [tenLoading, setTenLoading] = useState(true);
  const [tenSaving, setTenSaving]   = useState(false);
  const [tenMsg, setTenMsg]   = useState("");
  const logoRef               = useRef<HTMLInputElement>(null);

  // Pengurus state
  const [pengurus, setPengurus]   = useState<Pengurus[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Load tenant + pengurus
  const loadRT = useCallback(async () => {
    setTenLoading(true);
    const res  = await fetch("/api/v1/profil-rt");
    const json = await res.json();
    if (json.success) {
      setTenant(json.data.tenant);
      setTenForm(json.data.tenant);
      setLogo(json.data.tenant.logo ?? "");
      setPengurus(json.data.organisasi);
    }
    setTenLoading(false);
  }, []);

  useEffect(() => { loadRT(); }, [loadRT]);
  useEffect(() => {
    if (session?.user?.name) setAccForm((f) => ({ ...f, name: session.user.name ?? "" }));
  }, [session?.user?.name]);

  async function uploadAvatar(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "avatar");
    const res  = await fetch("/api/v1/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json.success) setAvatar(json.url);
  }

  async function uploadLogo(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "logo");
    const res  = await fetch("/api/v1/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json.success) setLogo(json.url);
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccSaving(true);
    setAccMsg("");
    const res = await fetch("/api/v1/profil-saya", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: accForm.name, phone: accForm.phone, avatar: avatar || null }),
    });
    if (res.ok) {
      setAccMsg("Akun berhasil diperbarui");
      await updateSession({ name: accForm.name });
    } else {
      setAccMsg("Gagal memperbarui akun");
    }
    setAccSaving(false);
  }

  async function saveTenant(e: React.FormEvent) {
    e.preventDefault();
    setTenSaving(true);
    setTenMsg("");
    const res = await fetch("/api/v1/profil-rt", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...tenForm, logo: logo || null }),
    });
    if (res.ok) {
      setTenMsg("Profil RT berhasil diperbarui");
      await loadRT();
    } else {
      setTenMsg("Gagal memperbarui profil RT");
    }
    setTenSaving(false);
  }

  async function deletePengurus(id: string) {
    if (!confirm("Hapus pengurus ini?")) return;
    await fetch(`/api/v1/organisasi/${id}`, { method: "DELETE" });
    loadRT();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" /> Pengaturan Profil
        </h1>
        <p className="text-sm text-muted-foreground">Kelola informasi akun, profil RT, dan susunan pengurus</p>
      </div>

      {/* ── 1. Informasi Akun ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Informasi Akun
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveAccount} className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                    {(session?.user?.name ?? "A")[0].toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-white border rounded-full p-1.5 shadow hover:bg-gray-50"
                >
                  <Camera className="h-3 w-3 text-gray-600" />
                </button>
              </div>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) uploadAvatar(e.target.files[0]); }}
              />
              <div>
                <p className="font-medium">{session?.user?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                <Badge variant="secondary" className="text-xs mt-1">{getRoleLabel(role)}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nama Tampilan</label>
                <Input
                  value={accForm.name}
                  onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nomor HP</label>
                <Input
                  value={accForm.phone}
                  onChange={(e) => setAccForm({ ...accForm, phone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={accSaving}>
                <Save className="h-4 w-4 mr-2" />
                {accSaving ? "Menyimpan..." : "Simpan Akun"}
              </Button>
              {accMsg && (
                <span className={`text-sm ${accMsg.includes("berhasil") ? "text-green-600" : "text-red-500"}`}>
                  {accMsg}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── 2. Profil RT ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Profil RT / RW
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenLoading ? (
            <div className="h-40 animate-pulse bg-gray-100 rounded-lg" />
          ) : (
            <form onSubmit={saveTenant} className="space-y-4">
              {/* Logo upload */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="logo RT" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) uploadLogo(e.target.files[0]); }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => logoRef.current?.click()}>
                    <Camera className="h-3.5 w-3.5 mr-1.5" /> Upload Logo RT
                  </Button>
                  {logo && (
                    <button type="button" onClick={() => setLogo("")} className="ml-2 text-xs text-red-500 underline">
                      Hapus
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Logo akan tampil di kop surat resmi</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Nama RT / Komunitas</label>
                  <Input
                    value={tenForm.name ?? ""}
                    onChange={(e) => setTenForm({ ...tenForm, name: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Nomor RT</label>
                  <Input
                    value={tenForm.rtNumber ?? ""}
                    onChange={(e) => setTenForm({ ...tenForm, rtNumber: e.target.value })}
                    placeholder="001"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Nomor RW</label>
                  <Input
                    value={tenForm.rwNumber ?? ""}
                    onChange={(e) => setTenForm({ ...tenForm, rwNumber: e.target.value })}
                    placeholder="002"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Kelurahan / Desa</label>
                  <Input
                    value={tenForm.kelurahan ?? ""}
                    onChange={(e) => setTenForm({ ...tenForm, kelurahan: e.target.value })}
                    placeholder="Nama kelurahan"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Kecamatan</label>
                  <Input
                    value={tenForm.kecamatan ?? ""}
                    onChange={(e) => setTenForm({ ...tenForm, kecamatan: e.target.value })}
                    placeholder="Nama kecamatan"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Kota / Kabupaten</label>
                  <Input
                    value={tenForm.kota ?? ""}
                    onChange={(e) => setTenForm({ ...tenForm, kota: e.target.value })}
                    placeholder="Nama kota"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Provinsi</label>
                  <Input
                    value={tenForm.provinsi ?? ""}
                    onChange={(e) => setTenForm({ ...tenForm, provinsi: e.target.value })}
                    placeholder="Nama provinsi"
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Alamat Sekretariat</label>
                  <Input
                    value={tenForm.address ?? ""}
                    onChange={(e) => setTenForm({ ...tenForm, address: e.target.value })}
                    placeholder="Jl. ..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> Telepon RT
                  </label>
                  <Input
                    value={tenForm.phone ?? ""}
                    onChange={(e) => setTenForm({ ...tenForm, phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email RT</label>
                  <Input
                    type="email"
                    value={tenForm.email ?? ""}
                    onChange={(e) => setTenForm({ ...tenForm, email: e.target.value })}
                    placeholder="rt001@gmail.com"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Preview kop surat info */}
              {tenant && (
                <div className="p-3 bg-gray-50 border rounded-lg text-xs text-muted-foreground">
                  <p className="font-medium text-gray-700 mb-1">Preview kop surat:</p>
                  <p className="font-semibold text-gray-800">
                    RT {tenForm.rtNumber ?? tenant.rtNumber} / RW {tenForm.rwNumber ?? tenant.rwNumber}
                    {tenForm.kelurahan ? ` — Kel. ${tenForm.kelurahan}` : ""}
                  </p>
                  <p>{[tenForm.kecamatan, tenForm.kota, tenForm.provinsi].filter(Boolean).join(", ")}</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={tenSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {tenSaving ? "Menyimpan..." : "Simpan Profil RT"}
                </Button>
                {tenMsg && (
                  <span className={`text-sm ${tenMsg.includes("berhasil") ? "text-green-600" : "text-red-500"}`}>
                    {tenMsg}
                  </span>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── 3. Susunan Pengurus / PIC ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Susunan Pengurus RT
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => { setShowAddForm(true); setEditingId(null); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add form */}
          {showAddForm && (
            <PengurusForm
              urutan={pengurus.length}
              onSave={() => { setShowAddForm(false); loadRT(); }}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* List */}
          {pengurus.length === 0 && !showAddForm ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Belum ada pengurus terdaftar</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddForm(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah Pengurus Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {pengurus.map((p) =>
                editingId === p.id ? (
                  <PengurusForm
                    key={p.id}
                    initial={p}
                    urutan={p.urutan}
                    onSave={() => { setEditingId(null); loadRT(); }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <PengurusCard
                    key={p.id}
                    p={p}
                    onEdit={() => { setEditingId(p.id); setShowAddForm(false); }}
                    onDelete={() => deletePengurus(p.id)}
                  />
                )
              )}
            </div>
          )}

          {pengurus.length > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              {pengurus.length} pengurus terdaftar · Urutkan dengan mengubah angka urutan pada form edit
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── 4. Keamanan ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Keamanan Akun
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-gray-50 border rounded-lg">
            <InfoRow label="Email Login">
              <span className="font-mono">{session?.user?.email}</span>
            </InfoRow>
          </div>
          <p className="text-sm text-muted-foreground">
            Untuk mengubah password atau memindahkan akses admin ke pengurus lain, hubungi Admin Server.
          </p>
          <Button variant="outline" disabled>
            <X className="h-4 w-4 mr-2 opacity-50" /> Ubah Password (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Store, Plus, X, Trash2, Package, Megaphone,
  Phone, Globe, CheckCircle2, XCircle,
  Pencil, Save, ToggleLeft, ToggleRight,
} from "lucide-react";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsahaWargaT {
  id: string;
  namaUsaha: string;
  pemilik: string;
  jenis: string;
  alamat: string | null;
  nomorHP: string | null;
  deskripsi: string | null;
  foto: string | null;
  isActive: boolean;
  isMarketplace: boolean;
  _count: { products: number };
}

interface ProductT {
  id: string;
  nama: string;
  deskripsi: string | null;
  harga: number | string;
  foto: string | null;
  kategori: string | null;
  stok: number | null;
  isAvailable: boolean;
}

interface IklanT {
  id: string;
  durasi: number;
  harga: number | string;
  status: "MENUNGGU_BAYAR" | "AKTIF" | "KADALUARSA" | "DITOLAK";
  mulaiTayang: string | null;
  selesaiTayang: string | null;
  buktiPembayaran: string | null;
  catatan: string | null;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRp(n: number | string) {
  return "Rp " + Number(n).toLocaleString("id-ID");
}

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastItem { id: number; type: "success" | "error"; msg: string }

function ToastStack({ items, rm }: { items: ToastItem[]; rm: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
      {items.map(t => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white pointer-events-auto min-w-[240px]",
            t.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          <span className="flex-1">{t.msg}</span>
          <button onClick={() => rm(t.id)} className="opacity-80 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Slide-Over ───────────────────────────────────────────────────────────────

function SlideOver({
  open, onClose, children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:max-w-[640px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {children}
      </div>
    </>
  );
}

// ─── Form Field Helper ────────────────────────────────────────────────────────

function FF({
  label, required, children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsahaWargaPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RT_ADMIN, UserRole.RW_ADMIN, UserRole.SUPER_ADMIN]}>
      <UsahaWargaContent />
    </RoleGuard>
  );
}

function UsahaWargaContent() {
  const { data: session } = useSession();
  const role = (session?.user?.role ?? "RT_ADMIN") as UserRole;

  // List state
  const [list, setList] = useState<UsahaWargaT[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    namaUsaha: "", pemilik: "", jenis: "", alamat: "", nomorHP: "", deskripsi: "",
  });

  // Detail slide-over
  const [selected, setSelected] = useState<UsahaWargaT | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const addToast = useCallback((type: "success" | "error", msg: string) => {
    const id = Date.now();
    setToasts(p => [...p, { id, type, msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  const rmToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ ...(search && { search }) });
      const res = await fetch(`/api/v1/usaha-warga?${q}`);
      const d = await res.json();
      if (d.success) setList(Array.isArray(d.data) ? d.data : []);
    } catch { /* silent */ }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchList(); }, [fetchList]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/usaha-warga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.success) {
        setForm({ namaUsaha: "", pemilik: "", jenis: "", alamat: "", nomorHP: "", deskripsi: "" });
        setShowForm(false);
        fetchList();
        addToast("success", "Usaha berhasil ditambahkan");
      } else {
        addToast("error", d.error ?? "Gagal menambah usaha");
      }
    } finally { setSubmitting(false); }
  }

  async function handleToggleMkt(u: UsahaWargaT) {
    const next = !u.isMarketplace;
    try {
      const res = await fetch("/api/v1/usaha-warga", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, isMarketplace: next }),
      });
      const d = await res.json();
      if (d.success) {
        setList(l => l.map(x => x.id === u.id ? { ...x, isMarketplace: next } : x));
        if (selected?.id === u.id) setSelected(s => s ? { ...s, isMarketplace: next } : s);
        addToast("success", next ? "Ditambahkan ke Marketplace" : "Dihapus dari Marketplace");
      } else {
        addToast("error", d.error ?? "Gagal mengubah status marketplace");
      }
    } catch { addToast("error", "Terjadi kesalahan"); }
  }

  async function handleDelete(u: UsahaWargaT) {
    if (!confirm(`Nonaktifkan usaha "${u.namaUsaha}"?`)) return;
    try {
      const res = await fetch(`/api/v1/usaha-warga?id=${u.id}`, { method: "DELETE" });
      const d = await res.json();
      if (d.success) {
        fetchList();
        if (selected?.id === u.id) setSelected(null);
        addToast("success", "Usaha dinonaktifkan");
      } else {
        addToast("error", d.error ?? "Gagal menghapus");
      }
    } catch { addToast("error", "Terjadi kesalahan"); }
  }

  return (
    <div className="space-y-6">
      <ToastStack items={toasts} rm={rmToast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usaha Warga</h1>
          <p className="text-muted-foreground text-sm">Kelola UMKM dan usaha warga RT</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Batal" : "Tambah Usaha"}
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Cari nama usaha, pemilik, atau jenis..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Add Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-5">
            <h3 className="font-semibold mb-4 text-base">Tambah Usaha Baru</h3>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FF label="Nama Usaha" required>
                <Input
                  value={form.namaUsaha}
                  onChange={e => setForm({ ...form, namaUsaha: e.target.value })}
                  placeholder="Nama usaha" required
                />
              </FF>
              <FF label="Pemilik" required>
                <Input
                  value={form.pemilik}
                  onChange={e => setForm({ ...form, pemilik: e.target.value })}
                  placeholder="Nama pemilik" required
                />
              </FF>
              <FF label="Jenis Usaha" required>
                <Input
                  value={form.jenis}
                  onChange={e => setForm({ ...form, jenis: e.target.value })}
                  placeholder="Makanan, Jasa, Retail..." required
                />
              </FF>
              <FF label="Alamat">
                <Input
                  value={form.alamat}
                  onChange={e => setForm({ ...form, alamat: e.target.value })}
                  placeholder="Alamat usaha"
                />
              </FF>
              <FF label="Nomor HP">
                <Input
                  value={form.nomorHP}
                  onChange={e => setForm({ ...form, nomorHP: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                />
              </FF>
              <FF label="Deskripsi">
                <Input
                  value={form.deskripsi}
                  onChange={e => setForm({ ...form, deskripsi: e.target.value })}
                  placeholder="Deskripsi singkat"
                />
              </FF>
              <div className="flex items-end">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Menyimpan..." : "Simpan Usaha"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Store className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-lg font-medium mb-1">Belum ada usaha terdaftar</p>
            <p className="text-sm text-muted-foreground mb-4">Tambah usaha warga pertama</p>
            <Button variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />Tambah Usaha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(u => (
            <div
              key={u.id}
              className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setSelected(u)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {u.namaUsaha}
                  </h3>
                  <p className="text-sm text-muted-foreground">{u.pemilik}</p>
                </div>
                <Badge variant="secondary" className="text-xs flex-shrink-0">{u.jenis}</Badge>
              </div>

              {u.deskripsi && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{u.deskripsi}</p>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  {u._count.products} produk
                </span>
                {u.nomorHP && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {u.nomorHP}
                  </span>
                )}
              </div>

              {/* Actions row — stop propagation so clicking these doesn't open detail */}
              <div
                className="flex items-center gap-2"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => handleToggleMkt(u)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
                    u.isMarketplace
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                  )}
                  title={u.isMarketplace ? "Klik untuk hapus dari Marketplace" : "Klik untuk tampilkan di Marketplace"}
                >
                  <Globe className="h-3 w-3" />
                  {u.isMarketplace ? "Marketplace ✓" : "Non-Marketplace"}
                </button>
                <span className="flex-1" />
                <button
                  className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => handleDelete(u)}
                  title="Nonaktifkan usaha"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Slide-Over */}
      <SlideOver open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <UsahaDetail
            key={selected.id}
            usaha={selected}
            role={role}
            onClose={() => { setSelected(null); fetchList(); }}
            onToast={addToast}
            onUpdateUsaha={updated => {
              setSelected(updated);
              setList(l => l.map(x => x.id === updated.id ? updated : x));
            }}
            onToggleMkt={() => handleToggleMkt(selected)}
          />
        )}
      </SlideOver>
    </div>
  );
}

// ─── Usaha Detail (inside SlideOver) ─────────────────────────────────────────

function UsahaDetail({
  usaha, role, onClose, onToast, onUpdateUsaha, onToggleMkt,
}: {
  usaha: UsahaWargaT;
  role: UserRole;
  onClose: () => void;
  onToast: (type: "success" | "error", msg: string) => void;
  onUpdateUsaha: (u: UsahaWargaT) => void;
  onToggleMkt: () => void;
}) {
  const [tab, setTab] = useState<"info" | "produk" | "iklan">("info");

  const tabs = [
    { key: "info" as const, label: "Info & Edit", icon: <Pencil className="h-3.5 w-3.5" /> },
    { key: "produk" as const, label: "Produk", icon: <Package className="h-3.5 w-3.5" /> },
    { key: "iklan" as const, label: "Iklan", icon: <Megaphone className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Panel Header */}
      <div className="flex items-start justify-between p-4 border-b bg-gray-50 flex-shrink-0">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-lg leading-tight">{usaha.namaUsaha}</h2>
            {usaha.isMarketplace && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                <Globe className="h-3 w-3 mr-1" />Marketplace
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{usaha.pemilik} · {usaha.jenis}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 rounded-md transition-colors flex-shrink-0"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b flex-shrink-0 bg-white px-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "info" && (
          <InfoTab
            usaha={usaha}
            onToast={onToast}
            onUpdate={onUpdateUsaha}
            onToggleMkt={onToggleMkt}
          />
        )}
        {tab === "produk" && (
          <ProdukTab usahaId={usaha.id} onToast={onToast} />
        )}
        {tab === "iklan" && (
          <IklanTab usahaId={usaha.id} role={role} onToast={onToast} />
        )}
      </div>
    </div>
  );
}

// ─── Info Tab ─────────────────────────────────────────────────────────────────

function InfoTab({
  usaha, onToast, onUpdate, onToggleMkt,
}: {
  usaha: UsahaWargaT;
  onToast: (t: "success" | "error", m: string) => void;
  onUpdate: (u: UsahaWargaT) => void;
  onToggleMkt: () => void;
}) {
  const [form, setForm] = useState({
    namaUsaha: usaha.namaUsaha,
    pemilik:   usaha.pemilik,
    jenis:     usaha.jenis,
    alamat:    usaha.alamat   ?? "",
    nomorHP:   usaha.nomorHP  ?? "",
    deskripsi: usaha.deskripsi ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function setF<K extends keyof typeof form>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/usaha-warga", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: usaha.id, ...form }),
      });
      const d = await res.json();
      if (d.success) {
        onUpdate({ ...usaha, ...d.data });
        onToast("success", "Usaha berhasil diperbarui");
        setDirty(false);
      } else {
        onToast("error", d.error ?? "Gagal menyimpan");
      }
    } finally { setSaving(false); }
  }

  return (
    <div className="p-4 space-y-5">
      {/* Marketplace Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
        <div>
          <p className="text-sm font-semibold">Tampil di Marketplace</p>
          <p className="text-xs text-muted-foreground mt-0.5">Produk usaha ini terlihat oleh warga RT lain</p>
        </div>
        <button
          onClick={onToggleMkt}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-w-[100px] justify-center",
            usaha.isMarketplace
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-gray-200 text-gray-600 hover:bg-gray-300",
          )}
        >
          {usaha.isMarketplace
            ? <><ToggleRight className="h-4 w-4" />Aktif</>
            : <><ToggleLeft className="h-4 w-4" />Non-aktif</>}
        </button>
      </div>

      {/* Edit Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FF label="Nama Usaha" required>
          <Input value={form.namaUsaha} onChange={e => setF("namaUsaha", e.target.value)} />
        </FF>
        <FF label="Pemilik" required>
          <Input value={form.pemilik} onChange={e => setF("pemilik", e.target.value)} />
        </FF>
        <FF label="Jenis Usaha" required>
          <Input value={form.jenis} onChange={e => setF("jenis", e.target.value)} />
        </FF>
        <FF label="Nomor HP">
          <Input
            value={form.nomorHP}
            onChange={e => setF("nomorHP", e.target.value)}
            placeholder="08xxxxxxxxxx"
          />
        </FF>
        <FF label="Alamat">
          <Input
            value={form.alamat}
            onChange={e => setF("alamat", e.target.value)}
            placeholder="Alamat usaha"
          />
        </FF>
        <FF label="Deskripsi">
          <Input
            value={form.deskripsi}
            onChange={e => setF("deskripsi", e.target.value)}
            placeholder="Deskripsi singkat"
          />
        </FF>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
        {!dirty && (
          <p className="text-xs text-muted-foreground">Belum ada perubahan</p>
        )}
      </div>

      <div className="pt-3 border-t">
        <p className="text-sm text-muted-foreground">
          Total Produk:{" "}
          <span className="font-semibold text-foreground">{usaha._count.products}</span>
        </p>
      </div>
    </div>
  );
}

// ─── Produk Tab ───────────────────────────────────────────────────────────────

function ProdukTab({
  usahaId, onToast,
}: {
  usahaId: string;
  onToast: (t: "success" | "error", m: string) => void;
}) {
  const [products, setProducts] = useState<ProductT[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ nama: "", harga: "", kategori: "", deskripsi: "", stok: "" });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/products?usahaWargaId=${usahaId}`);
      const d = await res.json();
      if (d.success) setProducts(Array.isArray(d.data) ? d.data : []);
    } catch { /* silent */ }
    setLoading(false);
  }, [usahaId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  function startAdd() {
    setEditId(null);
    setForm({ nama: "", harga: "", kategori: "", deskripsi: "", stok: "" });
    setShowForm(true);
  }

  function startEdit(p: ProductT) {
    setEditId(p.id);
    setForm({
      nama:      p.nama,
      harga:     String(p.harga),
      kategori:  p.kategori  ?? "",
      deskripsi: p.deskripsi ?? "",
      stok:      p.stok != null ? String(p.stok) : "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        nama:      form.nama,
        harga:     Number(form.harga),
        kategori:  form.kategori  || null,
        deskripsi: form.deskripsi || null,
        stok:      form.stok ? Number(form.stok) : null,
      };

      const url = editId ? `/api/v1/products/${editId}` : "/api/v1/products";
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? payload : { ...payload, usahaWargaId: usahaId }),
      });
      const d = await res.json();
      if (d.success) {
        fetchProducts();
        setShowForm(false);
        setEditId(null);
        onToast("success", editId ? "Produk diperbarui" : "Produk ditambahkan");
      } else {
        onToast("error", d.error ?? "Gagal menyimpan produk");
      }
    } finally { setSubmitting(false); }
  }

  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus produk "${nama}"?`)) return;
    try {
      const res = await fetch(`/api/v1/products/${id}`, { method: "DELETE" });
      const d = await res.json();
      if (d.success) { fetchProducts(); onToast("success", "Produk dihapus"); }
      else onToast("error", d.error ?? "Gagal menghapus");
    } catch { onToast("error", "Terjadi kesalahan"); }
  }

  async function handleToggleAvailable(p: ProductT) {
    try {
      const res = await fetch(`/api/v1/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !p.isAvailable }),
      });
      const d = await res.json();
      if (d.success) {
        setProducts(l => l.map(x => x.id === p.id ? { ...x, isAvailable: !p.isAvailable } : x));
        onToast("success", `Produk ${!p.isAvailable ? "diaktifkan" : "dinonaktifkan"}`);
      } else {
        onToast("error", d.error ?? "Gagal mengubah status");
      }
    } catch { onToast("error", "Terjadi kesalahan"); }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{products.length} produk</p>
        <Button size="sm" onClick={startAdd}>
          <Plus className="h-4 w-4 mr-1" />Tambah Produk
        </Button>
      </div>

      {/* Product Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 text-sm">{editId ? "Edit Produk" : "Tambah Produk"}</h4>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FF label="Nama Produk" required>
                <Input
                  value={form.nama}
                  onChange={e => setForm({ ...form, nama: e.target.value })}
                  placeholder="Nama produk" required
                />
              </FF>
              <FF label="Harga (Rp)" required>
                <Input
                  type="number"
                  value={form.harga}
                  onChange={e => setForm({ ...form, harga: e.target.value })}
                  placeholder="25000" required min="0"
                />
              </FF>
              <FF label="Kategori">
                <Input
                  value={form.kategori}
                  onChange={e => setForm({ ...form, kategori: e.target.value })}
                  placeholder="Makanan, Minuman, Jasa..."
                />
              </FF>
              <FF label="Stok">
                <Input
                  type="number"
                  value={form.stok}
                  onChange={e => setForm({ ...form, stok: e.target.value })}
                  placeholder="Kosongkan jika tidak terbatas"
                  min="0"
                />
              </FF>
              <div className="sm:col-span-2">
                <FF label="Deskripsi">
                  <Input
                    value={form.deskripsi}
                    onChange={e => setForm({ ...form, deskripsi: e.target.value })}
                    placeholder="Deskripsi singkat produk"
                  />
                </FF>
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Menyimpan..." : (editId ? "Perbarui" : "Tambah Produk")}
                </Button>
                <Button
                  type="button" size="sm" variant="ghost"
                  onClick={() => { setShowForm(false); setEditId(null); }}
                >
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Product List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Belum ada produk</p>
          <Button variant="link" size="sm" onClick={startAdd}>Tambah produk pertama</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map(p => (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                p.isAvailable ? "bg-white" : "bg-gray-50 opacity-70",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{p.nama}</span>
                  {p.kategori && (
                    <Badge variant="outline" className="text-xs">{p.kategori}</Badge>
                  )}
                  {!p.isAvailable && (
                    <Badge variant="secondary" className="text-xs">Tidak tersedia</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="font-semibold text-foreground">{fmtRp(p.harga)}</span>
                  {p.stok != null && <span>Stok: {p.stok}</span>}
                  {p.deskripsi && (
                    <span className="truncate max-w-[160px]">{p.deskripsi}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleAvailable(p)}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    p.isAvailable
                      ? "text-emerald-600 hover:bg-emerald-50"
                      : "text-gray-400 hover:bg-gray-100",
                  )}
                  title={p.isAvailable ? "Nonaktifkan" : "Aktifkan"}
                >
                  {p.isAvailable
                    ? <CheckCircle2 className="h-4 w-4" />
                    : <XCircle className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => startEdit(p)}
                  className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(p.id, p.nama)}
                  className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-colors"
                  title="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Iklan Tab ────────────────────────────────────────────────────────────────

const IKLAN_PAKET: Record<number, number> = { 7: 10_000, 14: 18_000, 30: 30_000 };

function IklanTab({
  usahaId, role, onToast,
}: {
  usahaId: string;
  role: UserRole;
  onToast: (t: "success" | "error", m: string) => void;
}) {
  const [iklanList, setIklanList] = useState<IklanT[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [durasi, setDurasi] = useState<7 | 14 | 30>(7);
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = role === "RT_ADMIN" || role === "SUPER_ADMIN" || role === "RW_ADMIN";

  const fetchIklan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/iklan?usahaWargaId=${usahaId}`);
      const d = await res.json();
      if (d.success) setIklanList(Array.isArray(d.data) ? d.data : []);
    } catch { /* silent */ }
    setLoading(false);
  }, [usahaId]);

  useEffect(() => { fetchIklan(); }, [fetchIklan]);

  async function handleCreate() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/iklan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usahaWargaId: usahaId, durasi }),
      });
      const d = await res.json();
      if (d.success) {
        fetchIklan();
        setShowForm(false);
        onToast("success", "Pesanan iklan dibuat — menunggu verifikasi admin");
      } else {
        onToast("error", d.error ?? "Gagal membuat iklan");
      }
    } finally { setSubmitting(false); }
  }

  async function handleAdminAction(id: string, action: "aktivasi" | "tolak") {
    try {
      const res = await fetch(`/api/v1/iklan/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (d.success) {
        fetchIklan();
        onToast("success", action === "aktivasi" ? "Iklan diaktifkan" : "Iklan ditolak");
      } else {
        onToast("error", d.error ?? "Gagal memperbarui iklan");
      }
    } catch { onToast("error", "Terjadi kesalahan"); }
  }

  async function handleDeleteIklan(id: string) {
    if (!confirm("Hapus iklan ini?")) return;
    try {
      const res = await fetch(`/api/v1/iklan/${id}`, { method: "DELETE" });
      const d = await res.json();
      if (d.success) { fetchIklan(); onToast("success", "Iklan dihapus"); }
      else onToast("error", d.error ?? "Gagal menghapus");
    } catch { onToast("error", "Terjadi kesalahan"); }
  }

  const statusUI: Record<IklanT["status"], { label: string; cls: string }> = {
    MENUNGGU_BAYAR: { label: "Menunggu Verifikasi", cls: "bg-amber-100 text-amber-700" },
    AKTIF:          { label: "Aktif", cls: "bg-emerald-100 text-emerald-700" },
    KADALUARSA:     { label: "Kadaluarsa", cls: "bg-gray-100 text-gray-500" },
    DITOLAK:        { label: "Ditolak", cls: "bg-red-100 text-red-700" },
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{iklanList.length} iklan</p>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm
            ? <><X className="h-4 w-4 mr-1" />Batal</>
            : <><Plus className="h-4 w-4 mr-1" />Pasang Iklan</>}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-4">
            <h4 className="font-medium text-sm">Pasang Iklan Unggulan</h4>
            <p className="text-xs text-muted-foreground">
              Usaha ini akan muncul sebagai iklan unggulan di halaman Marketplace.
            </p>

            <FF label="Pilih Durasi Iklan">
              <div className="grid grid-cols-3 gap-2 mt-1">
                {([7, 14, 30] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDurasi(d)}
                    className={cn(
                      "p-3 rounded-xl border-2 text-center transition-colors",
                      durasi === d
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-primary/40",
                    )}
                  >
                    <div className="font-bold text-sm">{d} hari</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{fmtRp(IKLAN_PAKET[d])}</div>
                  </button>
                ))}
              </div>
            </FF>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                💳 Setelah membuat pesanan, lakukan pembayaran ke rekening RT.
                Admin akan memverifikasi dan mengaktifkan iklan.
              </p>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={submitting}>
                {submitting ? "Membuat..." : `Buat Pesanan — ${fmtRp(IKLAN_PAKET[durasi])}`}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Iklan List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : iklanList.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Megaphone className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Belum ada iklan</p>
          <Button variant="link" size="sm" onClick={() => setShowForm(true)}>
            Pasang iklan pertama
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {iklanList.map(iklan => {
            const ui = statusUI[iklan.status];
            return (
              <div key={iklan.id} className="border rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">Iklan {iklan.durasi} hari</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ui.cls)}>
                        {ui.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtRp(iklan.harga)} · Dibuat {fmtDate(iklan.createdAt)}
                    </p>
                    {iklan.mulaiTayang && (
                      <p className="text-xs text-muted-foreground">
                        Tayang: {fmtDate(iklan.mulaiTayang)} s/d {fmtDate(iklan.selesaiTayang)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isAdmin && iklan.status === "MENUNGGU_BAYAR" && (
                      <>
                        <button
                          onClick={() => handleAdminAction(iklan.id, "aktivasi")}
                          className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Aktifkan iklan"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleAdminAction(iklan.id, "tolak")}
                          className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-colors"
                          title="Tolak iklan"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteIklan(iklan.id)}
                        className="p-1.5 rounded text-red-400 hover:bg-red-50 transition-colors"
                        title="Hapus iklan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {iklan.catatan && (
                  <p className="text-xs text-muted-foreground bg-gray-50 rounded-lg px-3 py-2">
                    {iklan.catatan}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Plus, Search, ChevronLeft, ChevronRight, Newspaper,
  X, Eye, Globe, FileText, Calendar, User, Pencil,
  Trash2, CheckCircle, Image as ImageIcon, Loader2,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Berita {
  id: string;
  judul: string;
  slug: string;
  konten: string;
  ringkasan: string | null;
  gambar: string | null;
  kategori: string | null;
  penulis: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  warga: { id: string; namaLengkap: string } | null;
}

const KATEGORI_LIST = ["Pengumuman", "Kegiatan", "Informasi", "Keamanan", "Keuangan", "Lainnya"];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

// ─── Article reader modal ──────────────────────────────────────────────────────

function ArticleModal({ berita, onClose }: { berita: Berita; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto p-4 py-10"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Cover image */}
        {berita.gambar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={berita.gambar} alt={berita.judul} className="w-full h-56 object-cover" />
        )}
        <div className="p-6 space-y-4">
          {/* Meta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {berita.kategori && (
                <Badge variant="outline" className="text-xs">{berita.kategori}</Badge>
              )}
              {berita.warga && (
                <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                  Ajuan Warga
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <h1 className="text-xl font-bold leading-snug">{berita.judul}</h1>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" /> {berita.penulis}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {berita.publishedAt ? formatDate(berita.publishedAt) : formatDate(berita.createdAt)}
            </span>
          </div>

          {berita.ringkasan && (
            <p className="text-sm font-medium text-muted-foreground border-l-4 border-primary/30 pl-3 italic">
              {berita.ringkasan}
            </p>
          )}

          {/* Konten — preserve newlines */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
            {berita.konten}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit modal (admin) ────────────────────────────────────────────────────────

function EditModal({
  berita,
  onSave,
  onClose,
}: {
  berita: Berita;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    judul:      berita.judul,
    ringkasan:  berita.ringkasan  ?? "",
    konten:     berita.konten,
    kategori:   berita.kategori   ?? "",
    penulis:    berita.penulis,
    isPublished: berita.isPublished,
  });
  const [gambar, setGambar]   = useState(berita.gambar ?? "");
  const [saving, setSaving]   = useState(false);
  const gambarRef             = useRef<HTMLInputElement>(null);

  async function uploadGambar(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "berita");
    const res  = await fetch("/api/v1/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json.success) setGambar(json.url);
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/v1/berita/${berita.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, gambar: gambar || null }),
    });
    setSaving(false);
    onSave();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto p-4 py-10">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">Edit Berita</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Judul *</label>
            <Input value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Penulis</label>
            <Input value={form.penulis} onChange={(e) => setForm({ ...form, penulis: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Kategori</label>
            <select
              value={form.kategori}
              onChange={(e) => setForm({ ...form, kategori: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm mt-1"
            >
              <option value="">— Pilih kategori —</option>
              {KATEGORI_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Ringkasan</label>
            <Input value={form.ringkasan} onChange={(e) => setForm({ ...form, ringkasan: e.target.value })} className="mt-1" placeholder="Ringkasan singkat (opsional)" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Konten *</label>
            <textarea
              value={form.konten}
              onChange={(e) => setForm({ ...form, konten: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm mt-1 min-h-[160px] resize-y"
            />
          </div>
          {/* Cover image */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Gambar Cover</label>
            <div className="flex items-center gap-2 mt-1">
              <input ref={gambarRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) uploadGambar(e.target.files[0]); }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => gambarRef.current?.click()}>
                <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Upload Gambar
              </Button>
              {gambar && <span className="text-xs text-green-700">✓ Gambar terpilih</span>}
              {gambar && <button onClick={() => setGambar("")} className="text-xs text-red-500 underline">Hapus</button>}
            </div>
            {gambar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={gambar} alt="preview" className="mt-2 h-28 rounded-lg object-cover border" />
            )}
          </div>
          {/* Publish toggle */}
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="editPublish"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
            />
            <label htmlFor="editPublish" className="text-sm">Publikasikan sekarang</label>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={saving || !form.judul || !form.konten}>
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
          <Button variant="outline" onClick={onClose}>Batal</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Berita card ───────────────────────────────────────────────────────────────

function BeritaCard({
  item,
  isAdmin,
  onRead,
  onEdit,
  onPublish,
  onDelete,
}: {
  item: Berita;
  isAdmin: boolean;
  onRead: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onRead}
    >
      {/* Cover */}
      {item.gambar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.gambar} alt={item.judul} className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-20 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <Newspaper className="h-8 w-8 text-primary/30" />
        </div>
      )}

      <div className="p-4 space-y-2">
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.kategori && (
            <Badge variant="outline" className="text-[10px]">{item.kategori}</Badge>
          )}
          {!item.isPublished && (
            <Badge variant="secondary" className="text-[10px]">Draft</Badge>
          )}
          {item.warga && !item.isPublished && (
            <Badge className="text-[10px] bg-orange-500">Ajuan Warga</Badge>
          )}
        </div>

        <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {item.judul}
        </h3>

        {item.ringkasan && (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.ringkasan}</p>
        )}

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" /> {item.penulis}
          </span>
          <span>{formatDate(item.publishedAt ?? item.createdAt)}</span>
        </div>

        {/* Admin action row — stop propagation */}
        {isAdmin && (
          <div
            className="flex gap-1.5 pt-1 border-t mt-1"
            onClick={(e) => e.stopPropagation()}
          >
            {!item.isPublished && (
              <Button size="sm" variant="outline"
                className="text-green-700 border-green-300 hover:bg-green-50 text-xs h-7 px-2"
                onClick={onPublish}
              >
                <Globe className="h-3 w-3 mr-1" /> Publikasikan
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create / Submit form ──────────────────────────────────────────────────────

function BeritaForm({
  isAdmin,
  penulisDefault,
  onSuccess,
  onClose,
}: {
  isAdmin: boolean;
  penulisDefault: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    judul: "", ringkasan: "", konten: "", kategori: "", penulis: penulisDefault, isPublished: false,
  });
  const [gambar, setGambar]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const gambarRef             = useRef<HTMLInputElement>(null);

  async function uploadGambar(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "berita");
    const res  = await fetch("/api/v1/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json.success) setGambar(json.url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/v1/berita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, gambar: gambar || null }),
    });
    const json = await res.json();
    if (json.success) onSuccess();
    setSubmitting(false);
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">
            {isAdmin ? "Tulis Berita Baru" : "Ajukan Berita / Informasi"}
          </h3>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        {!isAdmin && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
            Berita yang Anda ajukan akan ditinjau oleh pengurus RT sebelum dipublikasikan.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Judul *</label>
              <Input
                value={form.judul}
                onChange={(e) => setForm({ ...form, judul: e.target.value })}
                placeholder="Judul berita / informasi"
                className="mt-1"
                required
              />
            </div>
            {isAdmin && (
              <div>
                <label className="text-sm font-medium">Penulis</label>
                <Input
                  value={form.penulis}
                  onChange={(e) => setForm({ ...form, penulis: e.target.value })}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Kategori</label>
              <select
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm mt-1"
              >
                <option value="">— Pilih kategori —</option>
                {KATEGORI_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Ringkasan</label>
              <Input
                value={form.ringkasan}
                onChange={(e) => setForm({ ...form, ringkasan: e.target.value })}
                placeholder="Ringkasan singkat (opsional)"
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Konten / Isi *</label>
              <textarea
                value={form.konten}
                onChange={(e) => setForm({ ...form, konten: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm mt-1 min-h-[140px] resize-y"
                placeholder="Tuliskan isi berita atau informasi secara lengkap..."
                required
              />
            </div>
            {/* Gambar */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Gambar Cover (opsional)</label>
              <div className="flex items-center gap-2 mt-1">
                <input ref={gambarRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) uploadGambar(e.target.files[0]); }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => gambarRef.current?.click()}>
                  <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Pilih Gambar
                </Button>
                {gambar && <span className="text-xs text-green-700">✓ Gambar dipilih</span>}
              </div>
              {gambar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={gambar} alt="preview" className="mt-2 h-24 rounded-lg object-cover border" />
              )}
            </div>
            {/* Publish checkbox — admin only */}
            {isAdmin && (
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="publishNow"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                />
                <label htmlFor="publishNow" className="text-sm">Publikasikan sekarang</label>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={submitting || !form.judul || !form.konten}>
              {submitting
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Mengirim...</>
                : isAdmin ? "Simpan Berita" : "Kirim Ajuan"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BeritaPage() {
  const { data: session }  = useSession();
  const isAdmin            = session?.user?.role !== "RESIDENT";
  const penulisDefault     = session?.user?.name ?? "";

  const [items, setItems]       = useState<Berita[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterPub, setFilterPub] = useState("");
  const [filterKat, setFilterKat] = useState("");
  const [page, setPage]         = useState(1);
  const [meta, setMeta]         = useState({ total: 0, totalPages: 0 });
  const [showForm, setShowForm] = useState(false);
  const [reading, setReading]   = useState<Berita | null>(null);
  const [editing, setEditing]   = useState<Berita | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "12",
      ...(search    && { search }),
      ...(filterPub && { isPublished: filterPub }),
      ...(filterKat && { kategori: filterKat }),
    });
    const res  = await fetch(`/api/v1/berita?${params}`);
    const data = await res.json();
    if (data.success) { setItems(data.data); setMeta(data.meta); }
    setLoading(false);
  }, [page, search, filterPub, filterKat]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handlePublish(id: string) {
    await fetch(`/api/v1/berita/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: true }),
    });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus berita ini?")) return;
    await fetch(`/api/v1/berita/${id}`, { method: "DELETE" });
    fetchData();
  }

  const draftCount   = items.filter((i) => !i.isPublished && !i.warga).length;
  const ajuanCount   = items.filter((i) => !i.isPublished &&  i.warga).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="h-6 w-6" /> Berita
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Kelola berita dan informasi warga" : "Berita dan informasi terbaru dari RT"}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Tutup" : isAdmin ? "Tulis Berita" : "Ajukan Berita"}
        </Button>
      </div>

      {/* Admin stats chips */}
      {isAdmin && (draftCount > 0 || ajuanCount > 0) && (
        <div className="flex gap-2 flex-wrap">
          {draftCount > 0 && (
            <button
              onClick={() => { setFilterPub("false"); setPage(1); }}
              className="flex items-center gap-1.5 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-1.5 rounded-full hover:bg-yellow-100"
            >
              <FileText className="h-3.5 w-3.5" /> {draftCount} draft belum dipublikasi
            </button>
          )}
          {ajuanCount > 0 && (
            <button
              onClick={() => { setFilterPub("false"); setPage(1); }}
              className="flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-200 text-orange-800 px-3 py-1.5 rounded-full hover:bg-orange-100"
            >
              <CheckCircle className="h-3.5 w-3.5" /> {ajuanCount} ajuan warga menunggu review
            </button>
          )}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <BeritaForm
          isAdmin={isAdmin}
          penulisDefault={penulisDefault}
          onSuccess={() => { setShowForm(false); fetchData(); }}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari berita..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        {isAdmin && (
          <Select value={filterPub} onChange={(e) => { setFilterPub(e.target.value); setPage(1); }} className="w-36">
            <option value="">Semua Status</option>
            <option value="true">Dipublikasi</option>
            <option value="false">Draft / Ajuan</option>
          </Select>
        )}
        <Select value={filterKat} onChange={(e) => { setFilterKat(e.target.value); setPage(1); }} className="w-36">
          <option value="">Semua Kategori</option>
          {KATEGORI_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-xl overflow-hidden">
              <div className="h-32 animate-pulse bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 animate-pulse bg-gray-200 rounded w-3/4" />
                <div className="h-3 animate-pulse bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p>Belum ada berita</p>
          <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
            {isAdmin ? "Tulis Berita Pertama" : "Ajukan Berita"}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <BeritaCard
                key={item.id}
                item={item}
                isAdmin={isAdmin}
                onRead={() => setReading(item)}
                onEdit={() => setEditing(item)}
                onPublish={() => handlePublish(item.id)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Halaman {page} dari {meta.totalPages} &bull; {meta.total} berita
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {reading && <ArticleModal berita={reading} onClose={() => setReading(null)} />}
      {editing && (
        <EditModal
          berita={editing}
          onSave={() => { setEditing(null); fetchData(); }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

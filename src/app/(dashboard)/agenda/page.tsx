"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@prisma/client";
import {
  Plus, Search, ChevronLeft, ChevronRight,
  Calendar, MapPin, X, Clock, FileText,
  ChevronRight as ArrowRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Agenda {
  id: string;
  judul: string;
  deskripsi: string | null;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  lokasi: string | null;
  foto: string[];
  isPublished: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const MONTHS_FULL = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// ─── DateBox ─────────────────────────────────────────────────────────────────
function DateBox({ date, size = "md" }: { date: Date; size?: "sm" | "md" }) {
  const small = size === "sm";
  return (
    <div className={cn(
      "flex flex-col items-center justify-center rounded-2xl bg-indigo-50 shrink-0",
      small ? "w-10 h-12" : "w-14 h-16",
    )}>
      <span className={cn("font-semibold text-indigo-400 uppercase leading-none", small ? "text-[9px]" : "text-[10px]")}>
        {MONTHS_ID[date.getMonth()]}
      </span>
      <span className={cn("font-bold text-indigo-700 leading-tight", small ? "text-lg" : "text-2xl")}>
        {date.getDate()}
      </span>
      <span className={cn("text-indigo-400 leading-none", small ? "text-[8px]" : "text-[9px]")}>
        {date.getFullYear()}
      </span>
    </div>
  );
}

// ─── Slide-over Detail Panel ──────────────────────────────────────────────────
function AgendaDetail({
  agenda, onClose, isAdmin, onTogglePublish, onDelete,
}: {
  agenda: Agenda;
  onClose: () => void;
  isAdmin: boolean;
  onTogglePublish: (id: string, val: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const tglMulai = new Date(agenda.tanggalMulai);

  async function doToggle() {
    setBusy(true);
    await onTogglePublish(agenda.id, !agenda.isPublished);
    setBusy(false);
  }
  async function doDelete() {
    if (!confirm(`Hapus agenda "${agenda.judul}"?`)) return;
    setBusy(true);
    await onDelete(agenda.id);
    setBusy(false);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-indigo-600 px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Badge
                variant={agenda.isPublished ? "default" : "secondary"}
                className={cn("text-[10px] mb-2", agenda.isPublished ? "bg-white/20 text-white border-white/30" : "bg-white/10 text-white/70")}
              >
                {agenda.isPublished ? "Dipublikasikan" : "Draft"}
              </Badge>
              <h2 className="text-lg font-bold leading-snug">{agenda.judul}</h2>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white shrink-0 mt-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Date strip */}
          <div className="mt-4 flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div className="text-sm">
              <p className="font-semibold">{fmtDate(agenda.tanggalMulai)}</p>
              {agenda.tanggalSelesai && agenda.tanggalSelesai !== agenda.tanggalMulai && (
                <p className="text-white/70 text-xs">s/d {fmtDate(agenda.tanggalSelesai)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Time */}
          <div className="flex items-center gap-3 py-3 border-b">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Waktu Mulai</p>
              <p className="text-sm font-semibold text-gray-800">{fmtTime(agenda.tanggalMulai)}</p>
            </div>
            {agenda.tanggalSelesai && (
              <>
                <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Selesai</p>
                  <p className="text-sm font-semibold text-gray-800">{fmtTime(agenda.tanggalSelesai)}</p>
                </div>
              </>
            )}
          </div>

          {/* Location */}
          {agenda.lokasi && (
            <div className="flex items-center gap-3 py-3 border-b">
              <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Lokasi</p>
                <p className="text-sm font-semibold text-gray-800">{agenda.lokasi}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {agenda.deskripsi ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Deskripsi</p>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3">
                {agenda.deskripsi}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-4">Tidak ada deskripsi</p>
          )}

          {/* Photos */}
          {agenda.foto.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Foto</p>
              <div className="grid grid-cols-2 gap-2">
                {agenda.foto.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt={`foto-${i}`} className="rounded-xl object-cover aspect-video w-full" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="p-4 border-t bg-gray-50 space-y-2">
            <Button
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={doToggle}
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {agenda.isPublished ? "Jadikan Draft" : "Publikasikan"}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
              disabled={busy}
              onClick={doDelete}
            >
              Hapus Agenda
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Add Form Slide-over ──────────────────────────────────────────────────────
function AddAgendaPanel({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    judul: "", deskripsi: "", tanggalMulai: "", tanggalSelesai: "", lokasi: "", isPublished: true,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { onSaved(); onClose(); }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-base">Tambah Agenda</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <form id="agenda-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Judul *</label>
              <Input className="mt-1" value={form.judul} onChange={e => setForm({ ...form, judul: e.target.value })} placeholder="Judul kegiatan" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lokasi</label>
              <Input className="mt-1" value={form.lokasi} onChange={e => setForm({ ...form, lokasi: e.target.value })} placeholder="Balai RT, Masjid, dll" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tanggal Mulai *</label>
              <Input className="mt-1" type="datetime-local" value={form.tanggalMulai} onChange={e => setForm({ ...form, tanggalMulai: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tanggal Selesai</label>
              <Input className="mt-1" type="datetime-local" value={form.tanggalSelesai} onChange={e => setForm({ ...form, tanggalSelesai: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Deskripsi</label>
              <textarea
                className="mt-1 flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px] resize-none"
                value={form.deskripsi} onChange={e => setForm({ ...form, deskripsi: e.target.value })}
                placeholder="Deskripsi kegiatan..."
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-xl p-3">
              <input type="checkbox" className="w-4 h-4 rounded" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} />
              <div>
                <p className="text-sm font-medium">Publikasikan sekarang</p>
                <p className="text-xs text-gray-400">Warga dapat melihat agenda ini</p>
              </div>
            </label>
          </form>
        </div>
        <div className="p-4 border-t">
          <Button form="agenda-form" type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Simpan Agenda
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AgendaPage() {
  const { data: session } = useSession();
  const role = (session?.user?.role as UserRole) ?? "RESIDENT";
  const isAdmin = role === "RT_ADMIN" || role === "SUPER_ADMIN" || role === "RW_ADMIN";

  const [items, setItems] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [selected, setSelected] = useState<Agenda | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "10",
      ...(search && { search }),
    });
    const res = await fetch(`/api/v1/agenda?${params}`);
    const data = await res.json();
    if (data.success) {
      setItems(data.data);
      setMeta(data.meta);
    }
    setLoading(false);
  }, [page, search, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sync detail panel when items reload (e.g. after toggle)
  useEffect(() => {
    if (selected) {
      const updated = items.find(i => i.id === selected.id);
      if (updated) setSelected(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  async function handleTogglePublish(id: string, val: boolean) {
    await fetch(`/api/v1/agenda/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: val }),
    });
    await fetchData();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/v1/agenda/${id}`, { method: "DELETE" });
    await fetchData();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto lg:max-w-none">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Kelola agenda kegiatan RT/RW" : "Jadwal kegiatan warga"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAdd(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Agenda
          </Button>
        )}
      </div>

      {/* ── Card list ── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="px-5 pt-5 pb-4 border-b space-y-3">
          <h2 className="font-semibold text-gray-800">
            Daftar Agenda ({meta.total})
          </h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Cari agenda..."
                className="pr-10 rounded-xl"
              />
            </div>
            <Button type="submit" variant="secondary" size="icon" className="rounded-xl shrink-0">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Items */}
        <div className="divide-y">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex gap-4">
                  <div className="w-14 h-16 bg-gray-100 animate-pulse rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-gray-100 animate-pulse rounded w-3/4" />
                    <div className="h-3 bg-gray-100 animate-pulse rounded w-1/2" />
                    <div className="h-3 bg-gray-100 animate-pulse rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center px-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Calendar className="h-7 w-7 text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">Belum ada agenda</p>
                <p className="text-sm text-gray-400 mt-1">
                  {isAdmin ? "Tambahkan agenda kegiatan pertama" : "Belum ada agenda yang dijadwalkan"}
                </p>
              </div>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah Agenda
                </Button>
              )}
            </div>
          ) : (
            items.map((item) => {
              const tgl = new Date(item.tanggalMulai);
              return (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-start gap-4"
                >
                  <DateBox date={tgl} />
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-sm">{item.judul}</h3>
                      {isAdmin && (
                        <Badge
                          variant={item.isPublished ? "default" : "secondary"}
                          className="text-[10px] px-2 py-0"
                        >
                          {item.isPublished ? "Publikasi" : "Draft"}
                        </Badge>
                      )}
                    </div>
                    {item.deskripsi && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.deskripsi}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {fmtDate(item.tanggalMulai)}
                        {item.tanggalSelesai && item.tanggalSelesai !== item.tanggalMulai
                          ? ` - ${fmtDate(item.tanggalSelesai)}`
                          : ""}
                      </span>
                      {item.lokasi && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.lokasi}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 shrink-0 mt-3" />
                </button>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && !loading && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50/50">
            <p className="text-sm text-muted-foreground">
              Halaman {page} dari {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail slide-over ── */}
      {selected && (
        <AgendaDetail
          agenda={selected}
          onClose={() => setSelected(null)}
          isAdmin={isAdmin}
          onTogglePublish={handleTogglePublish}
          onDelete={handleDelete}
        />
      )}

      {/* ── Add form slide-over ── */}
      {showAdd && (
        <AddAgendaPanel
          onClose={() => setShowAdd(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}

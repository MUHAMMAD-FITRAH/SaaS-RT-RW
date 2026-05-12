"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Plus, Search, ChevronLeft, ChevronRight,
  ClipboardList, X, CheckCircle, Clock, Loader2, User,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Pengajuan {
  id: string;
  pengirim: string;
  kategori: string;
  judul: string;
  isi: string;
  status: string;
  tanggapan: string | null;
  tanggalTanggap: string | null;
  createdAt: string;
  warga: { id: string; namaLengkap: string; nik: string } | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const KATEGORI_LIST = [
  "Infrastruktur", "Fasilitas Umum", "Kegiatan Sosial",
  "Perizinan", "Administrasi", "Saran & Masukan", "Lainnya",
];

const STATUS_CFG: Record<string, {
  label: string;
  variant: "outline" | "secondary" | "default" | "destructive";
  icon: typeof Clock;
}> = {
  MENUNGGU:  { label: "Menunggu",  variant: "outline",     icon: Clock },
  DIPROSES:  { label: "Diproses",  variant: "secondary",   icon: Loader2 },
  DISETUJUI: { label: "Disetujui", variant: "default",     icon: CheckCircle },
  DITOLAK:   { label: "Ditolak",   variant: "destructive", icon: X },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

// ─── Respond panel (admin) ─────────────────────────────────────────────────────

function RespondPanel({
  id,
  currentTanggapan,
  onDone,
}: {
  id: string;
  currentTanggapan: string | null;
  onDone: () => void;
}) {
  const [status, setStatus]     = useState("");
  const [tanggapan, setTanggapan] = useState(currentTanggapan ?? "");
  const [saving, setSaving]     = useState(false);

  async function save() {
    if (!status) return;
    setSaving(true);
    await fetch(`/api/v1/pengajuan/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, tanggapan }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="border rounded-md px-2 py-1.5 text-sm"
      >
        <option value="">— Ubah Status —</option>
        <option value="DIPROSES">Diproses</option>
        <option value="DISETUJUI">Disetujui</option>
        <option value="DITOLAK">Ditolak</option>
      </select>
      <textarea
        value={tanggapan}
        onChange={(e) => setTanggapan(e.target.value)}
        className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] resize-none"
        placeholder="Tulis keterangan / tanggapan untuk warga..."
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={!status || saving} onClick={save}>
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button size="sm" variant="outline" onClick={onDone}>Batal</Button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function PengajuanPage() {
  const { data: session } = useSession();
  const isAdmin    = session?.user?.role !== "RESIDENT";
  const pengirimDefault = session?.user?.name ?? "";

  const [items, setItems]           = useState<Pengajuan[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [page, setPage]             = useState(1);
  const [meta, setMeta]             = useState({ total: 0, totalPages: 0 });
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    pengirim: pengirimDefault,
    kategori: "",
    judul: "",
    isi: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "10",
      ...(search         && { search }),
      ...(filterStatus   && { status: filterStatus }),
      ...(filterKategori && { kategori: filterKategori }),
    });
    const res  = await fetch(`/api/v1/pengajuan?${params}`);
    const data = await res.json();
    if (data.success) {
      setItems(data.data);
      setMeta(data.meta);
    }
    setLoading(false);
  }, [page, search, filterStatus, filterKategori]);

  useEffect(() => { fetchData(); }, [fetchData]);
  // sync pengirim default when session loads
  useEffect(() => {
    if (pengirimDefault && !form.pengirim) setForm((f) => ({ ...f, pengirim: pengirimDefault }));
  }, [pengirimDefault, form.pengirim]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/v1/pengajuan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (json.success) {
      setShowForm(false);
      setForm({ pengirim: pengirimDefault, kategori: "", judul: "", isi: "" });
      fetchData();
    }
    setSubmitting(false);
  }

  const pendingCount = items.filter((i) => i.status === "MENUNGGU").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" /> Pengajuan Warga
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Kelola pengajuan dan permintaan warga" : "Ajukan permohonan kepada pengurus RT"}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Tutup" : "Buat Pengajuan"}
        </Button>
      </div>

      {/* Pending reminder (admin) */}
      {isAdmin && pendingCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm">
          <Clock className="h-4 w-4 text-yellow-600 shrink-0" />
          <p className="text-yellow-800">
            <strong>{pendingCount} pengajuan</strong> menunggu tindakan dari pengurus RT.
          </p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Form Pengajuan Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nama *</label>
                  <Input
                    value={form.pengirim}
                    onChange={(e) => setForm({ ...form, pengirim: e.target.value })}
                    placeholder="Nama pengaju"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Kategori *</label>
                  <select
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Pilih kategori</option>
                    {KATEGORI_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Judul Pengajuan *</label>
                  <Input
                    value={form.judul}
                    onChange={(e) => setForm({ ...form, judul: e.target.value })}
                    placeholder="Judul permohonan Anda"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Detail Pengajuan *</label>
                <textarea
                  value={form.isi}
                  onChange={(e) => setForm({ ...form, isi: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm min-h-[100px] resize-none mt-1"
                  placeholder="Jelaskan permohonan Anda secara detail — apa yang diminta, tujuan, dan data pendukung..."
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting || !form.kategori || !form.judul || !form.isi}>
                  {submitting ? "Mengirim..." : "Kirim Pengajuan"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari pengajuan..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="w-36">
          <option value="">Semua Status</option>
          <option value="MENUNGGU">Menunggu</option>
          <option value="DIPROSES">Diproses</option>
          <option value="DISETUJUI">Disetujui</option>
          <option value="DITOLAK">Ditolak</option>
        </Select>
        <Select value={filterKategori} onChange={(e) => { setFilterKategori(e.target.value); setPage(1); }} className="w-36">
          <option value="">Semua Kategori</option>
          {KATEGORI_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
        </Select>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Pengajuan ({meta.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p>Belum ada pengajuan</p>
              <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
                Buat Pengajuan Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.MENUNGGU;
                const Icon = cfg.icon;
                return (
                  <div key={item.id} className="border rounded-xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Title + badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{item.judul}</h3>
                          <Badge variant={cfg.variant} className="text-xs">
                            <Icon className="h-3 w-3 mr-1" />
                            {cfg.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{item.kategori}</Badge>
                        </div>

                        {/* Body */}
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.isi}</p>

                        {/* Meta */}
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.warga ? item.warga.namaLengkap : item.pengirim}
                          </span>
                          <span>{formatDate(item.createdAt)}</span>
                          {item.tanggalTanggap && (
                            <span>Ditanggapi: {formatDate(item.tanggalTanggap)}</span>
                          )}
                        </div>

                        {/* Tanggapan */}
                        {item.tanggapan && (
                          <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                            <span className="font-medium text-blue-800">Tanggapan: </span>
                            <span className="text-blue-700">{item.tanggapan}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin respond panel */}
                    {isAdmin && respondingId === item.id ? (
                      <RespondPanel
                        id={item.id}
                        currentTanggapan={item.tanggapan}
                        onDone={() => { setRespondingId(null); fetchData(); }}
                      />
                    ) : isAdmin && item.status !== "DISETUJUI" && item.status !== "DITOLAK" ? (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRespondingId(item.id)}
                        >
                          Tanggapi
                        </Button>
                        {item.status === "MENUNGGU" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={async () => {
                              await fetch(`/api/v1/pengajuan/${item.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "DIPROSES" }),
                              });
                              fetchData();
                            }}
                          >
                            Proses
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {/* Pagination */}
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">Halaman {page} dari {meta.totalPages}</p>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

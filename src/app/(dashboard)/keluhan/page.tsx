"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Plus, Search, ChevronLeft, ChevronRight, MessageSquare,
  X, MapPin, Camera, AlertTriangle, CheckCircle, Clock,
  ExternalLink, Loader2, Siren, Copy,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Keluhan {
  id: string;
  pengirim: string;
  email: string | null;
  kategori: string;
  judul: string;
  isi: string;
  fotoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  isUrgent: boolean;
  status: string;
  tanggapan: string | null;
  tanggalTanggap: string | null;
  createdAt: string;
  warga: { id: string; namaLengkap: string; nik: string } | null;
}

interface DuplikatInfo {
  id: string;
  judul: string;
  status: string;
  createdAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  BARU:     { label: "Baru",     color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  DIPROSES: { label: "Diproses", color: "bg-blue-100 text-blue-800 border-blue-200",       icon: Loader2 },
  SELESAI:  { label: "Selesai",  color: "bg-green-100 text-green-800 border-green-200",    icon: CheckCircle },
  DITOLAK:  { label: "Ditolak",  color: "bg-red-100 text-red-800 border-red-200",          icon: X },
};

const KATEGORI_LIST = ["Infrastruktur", "Keamanan", "Kebersihan", "Sosial", "Keuangan", "Lainnya"];

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.BARU;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Duplikat warning modal ────────────────────────────────────────────────────

function DuplikatModal({
  info,
  onForce,
  onCancel,
}: {
  info: DuplikatInfo;
  onForce: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Copy className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold">Keluhan Serupa Ditemukan</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ada keluhan dengan judul serupa yang sudah dikirim dalam 7 hari terakhir:
            </p>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
          <p className="font-medium">{info.judul}</p>
          <div className="flex items-center gap-2 mt-1">
            <StatusPill status={info.status} />
            <span className="text-xs text-muted-foreground">{formatDate(info.createdAt)}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Apakah Anda tetap ingin mengirim keluhan baru, atau cukup pantau yang sudah ada?
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Batalkan</Button>
          <Button className="flex-1" onClick={onForce}>Kirim Tetap</Button>
        </div>
      </div>
    </div>
  );
}

// ─── SOS quick-submit modal ────────────────────────────────────────────────────

function SOSModal({ onClose, pengirimDefault }: { onClose: () => void; pengirimDefault: string }) {
  const [isi, setIsi]         = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [fotoUrl, setFotoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]       = useState(false);
  const fotoRef               = useRef<HTMLInputElement>(null);

  async function getGPS() {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
      ()    => { setGpsLoading(false); alert("GPS tidak tersedia — pastikan izin lokasi diberikan"); },
      { timeout: 8000 },
    );
  }

  async function uploadFoto(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "keluhan");
    const res = await fetch("/api/v1/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json.success) setFotoUrl(json.url);
  }

  async function handleSubmit() {
    if (!isi.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/v1/keluhan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pengirim:  pengirimDefault || "Warga",
        kategori:  "DARURAT",
        judul:     "🚨 DARURAT / SOS",
        isi:       isi.trim(),
        isUrgent:  true,
        fotoUrl:   fotoUrl || null,
        latitude:  coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        force:     true,
      }),
    });
    const json = await res.json();
    if (json.success) setDone(true);
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="font-bold text-lg">Laporan Terkirim!</h3>
          <p className="text-sm text-muted-foreground">
            Pengurus RT telah diberitahu. Tetap tenang dan tunggu respons.
          </p>
          <Button className="w-full" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Red header */}
        <div className="bg-red-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Siren className="h-5 w-5" />
            <span className="font-bold text-lg">LAPORAN DARURAT</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Ceritakan situasi darurat yang terjadi. Laporan ini akan langsung ditandai <strong>URGENT</strong> dan pengurus RT akan segera merespons.
          </p>

          <div>
            <label className="text-sm font-medium block mb-1">Situasi yang Terjadi *</label>
            <textarea
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="Contoh: Ada kebakaran di rumah No. 12, api sudah besar..."
              autoFocus
            />
          </div>

          {/* GPS capture */}
          <div className="flex items-center gap-2">
            {coords ? (
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg flex-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={getGPS}
                disabled={gpsLoading}
              >
                {gpsLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5 mr-1.5" />}
                {gpsLoading ? "Mencari lokasi..." : "Tandai Lokasi GPS"}
              </Button>
            )}
            <input ref={fotoRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) uploadFoto(e.target.files[0]); }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fotoRef.current?.click()}
              className={fotoUrl ? "border-green-400 text-green-700" : ""}
            >
              <Camera className="h-3.5 w-3.5" />
              {fotoUrl ? " ✓" : ""}
            </Button>
          </div>

          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white h-11"
            onClick={handleSubmit}
            disabled={submitting || !isi.trim()}
          >
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Siren className="h-4 w-4 mr-2" />}
            Kirim Laporan Darurat
          </Button>
        </div>
      </div>
    </div>
  );
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
    await fetch(`/api/v1/keluhan/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, tanggapan }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <div className="flex gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded-md px-2 py-1.5 text-sm"
        >
          <option value="">— Ubah Status —</option>
          <option value="DIPROSES">Diproses</option>
          <option value="SELESAI">Selesai</option>
          <option value="DITOLAK">Ditolak</option>
        </select>
      </div>
      <textarea
        value={tanggapan}
        onChange={(e) => setTanggapan(e.target.value)}
        className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] resize-none"
        placeholder="Tulis tanggapan untuk warga..."
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

// ─── Keluhan form ──────────────────────────────────────────────────────────────

function KeluhanForm({
  onSuccess,
  pengirimDefault,
  isAdmin,
}: {
  onSuccess: () => void;
  pengirimDefault: string;
  isAdmin: boolean;
}) {
  const [form, setForm]           = useState({ pengirim: pengirimDefault, email: "", kategori: "", judul: "", isi: "" });
  const [fotoUrl, setFotoUrl]     = useState("");
  const [coords, setCoords]       = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplikat, setDuplikat]   = useState<DuplikatInfo | null>(null);
  const fotoRef                   = useRef<HTMLInputElement>(null);

  async function uploadFoto(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "keluhan");
    const res = await fetch("/api/v1/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json.success) setFotoUrl(json.url);
  }

  function getGPS() {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
      () => setGpsLoading(false),
      { timeout: 8000 },
    );
  }

  async function submit(force = false) {
    setSubmitting(true);
    const res = await fetch("/api/v1/keluhan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        fotoUrl:   fotoUrl || null,
        latitude:  coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        force,
      }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (json.success && json.data?.duplicate) {
      setDuplikat(json.data.existing);
      return;
    }
    if (json.success) onSuccess();
  }

  return (
    <>
      <form
        onSubmit={(e) => { e.preventDefault(); submit(false); }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Nama Pengirim *</label>
            <Input
              value={form.pengirim}
              onChange={(e) => setForm({ ...form, pengirim: e.target.value })}
              placeholder="Nama pengirim"
              required
            />
          </div>
          {isAdmin && (
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email pengirim"
              />
            </div>
          )}
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
          <div>
            <label className="text-sm font-medium">Judul *</label>
            <Input
              value={form.judul}
              onChange={(e) => setForm({ ...form, judul: e.target.value })}
              placeholder="Judul keluhan"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Isi Keluhan *</label>
          <textarea
            value={form.isi}
            onChange={(e) => setForm({ ...form, isi: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm min-h-[100px] resize-none mt-1"
            placeholder="Jelaskan keluhan secara detail..."
            required
          />
        </div>

        {/* Foto + GPS row */}
        <div className="flex flex-wrap gap-2 items-center">
          <input ref={fotoRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) uploadFoto(e.target.files[0]); }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fotoRef.current?.click()}
            className={fotoUrl ? "border-green-400 text-green-700 bg-green-50" : ""}
          >
            <Camera className="h-3.5 w-3.5 mr-1.5" />
            {fotoUrl ? "Foto terlampir ✓" : "Lampirkan Foto"}
          </Button>

          {coords ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg">
              <MapPin className="h-3 w-3" /> GPS tercatat
            </span>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={getGPS} disabled={gpsLoading}>
              {gpsLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5 mr-1.5" />}
              {gpsLoading ? "Mencari..." : "Tandai GPS"}
            </Button>
          )}
        </div>

        <Button type="submit" disabled={submitting}>
          {submitting ? "Mengirim..." : "Kirim Keluhan"}
        </Button>
      </form>

      {duplikat && (
        <DuplikatModal
          info={duplikat}
          onForce={() => { setDuplikat(null); submit(true); }}
          onCancel={() => setDuplikat(null)}
        />
      )}
    </>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function KeluhanPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role !== "RESIDENT";
  const pengirimDefault = session?.user?.name ?? "";

  const [items, setItems]         = useState<Keluhan[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [page, setPage]           = useState(1);
  const [meta, setMeta]           = useState({ total: 0, totalPages: 0 });
  const [showForm, setShowForm]   = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [showSOS, setShowSOS]     = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "10",
      ...(search        && { search }),
      ...(filterStatus  && { status: filterStatus }),
      ...(filterKategori && { kategori: filterKategori }),
    });
    const res  = await fetch(`/api/v1/keluhan?${params}`);
    const data = await res.json();
    if (data.success) {
      setItems(data.data);
      setMeta(data.meta);
    }
    setLoading(false);
  }, [page, search, filterStatus, filterKategori]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const urgentCount = items.filter((i) => i.isUrgent && i.status === "BARU").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Keluhan Warga</h1>
          <p className="text-muted-foreground text-sm">Kelola keluhan dan aspirasi warga</p>
        </div>
        <div className="flex gap-2">
          {/* SOS button — visible to all (especially resident) */}
          <Button
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 animate-pulse"
            onClick={() => setShowSOS(true)}
          >
            <Siren className="h-4 w-4 mr-1.5" /> SOS Darurat
          </Button>
          <Button variant="outline" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showForm ? "Tutup" : "Tambah Keluhan"}
          </Button>
        </div>
      </div>

      {/* Urgent banner */}
      {isAdmin && urgentCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-300 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 animate-pulse" />
          <p className="text-red-800 font-medium text-sm">
            {urgentCount} keluhan DARURAT belum ditangani — tangani segera!
          </p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Keluhan Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <KeluhanForm
              pengirimDefault={pengirimDefault}
              isAdmin={isAdmin}
              onSuccess={() => { setShowForm(false); fetchData(); }}
            />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari keluhan..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="w-36">
          <option value="">Semua Status</option>
          <option value="BARU">Baru</option>
          <option value="DIPROSES">Diproses</option>
          <option value="SELESAI">Selesai</option>
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
          <CardTitle className="text-base">Daftar Keluhan ({meta.total})</CardTitle>
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
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p>Belum ada keluhan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-xl p-4 ${item.isUrgent ? "border-red-300 bg-red-50/50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1.5 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.isUrgent && (
                          <span className="inline-flex items-center gap-1 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                            <Siren className="h-3 w-3" /> DARURAT
                          </span>
                        )}
                        <h3 className="font-semibold">{item.judul}</h3>
                        <StatusPill status={item.status} />
                        <Badge variant="outline" className="text-xs">{item.kategori}</Badge>
                      </div>

                      {/* Body */}
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.isi}</p>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span>
                          {item.warga ? item.warga.namaLengkap : item.pengirim}
                        </span>
                        <span>{formatDate(item.createdAt)}</span>
                        {item.latitude && item.longitude && (
                          <a
                            href={`https://maps.google.com/?q=${item.latitude},${item.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <MapPin className="h-3 w-3" /> Lihat Peta
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>

                      {/* Foto */}
                      {item.fotoUrl && (
                        <a href={item.fotoUrl} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.fotoUrl}
                            alt="Bukti foto"
                            className="h-24 rounded-lg object-cover border mt-1 hover:opacity-90 transition-opacity"
                          />
                        </a>
                      )}

                      {/* Tanggapan */}
                      {item.tanggapan && (
                        <div className="mt-1.5 p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                          <span className="font-medium text-blue-800">Tanggapan Pengurus: </span>
                          <span className="text-blue-700">{item.tanggapan}</span>
                          {item.tanggalTanggap && (
                            <span className="text-xs text-blue-400 ml-2">({formatDate(item.tanggalTanggap)})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && respondingId === item.id ? (
                    <RespondPanel
                      id={item.id}
                      currentTanggapan={item.tanggapan}
                      onDone={() => { setRespondingId(null); fetchData(); }}
                    />
                  ) : isAdmin && item.status !== "SELESAI" && item.status !== "DITOLAK" ? (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline"
                        onClick={() => setRespondingId(item.id)}
                      >
                        Tanggapi
                      </Button>
                      {item.status === "BARU" && (
                        <Button size="sm" variant="secondary"
                          onClick={async () => {
                            await fetch(`/api/v1/keluhan/${item.id}`, {
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
              ))}

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

      {/* SOS Modal */}
      {showSOS && (
        <SOSModal
          pengirimDefault={pengirimDefault}
          onClose={() => { setShowSOS(false); fetchData(); }}
        />
      )}
    </div>
  );
}

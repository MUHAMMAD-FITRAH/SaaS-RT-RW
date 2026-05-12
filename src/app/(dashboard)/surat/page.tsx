"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import {
  FileText, Plus, Search, CheckCircle, XCircle, Clock,
  Filter, Printer, Trash2, User, X,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────────

const JENIS_SURAT_LABELS: Record<string, string> = {
  SURAT_PENGANTAR:   "Surat Pengantar",
  SURAT_KETERANGAN:  "Surat Keterangan",
  SURAT_DOMISILI:    "Surat Domisili",
  SURAT_TIDAK_MAMPU: "Surat Tidak Mampu",
  SURAT_KEMATIAN:    "Surat Kematian",
  SURAT_KELAHIRAN:   "Surat Kelahiran",
  SURAT_PINDAH:      "Surat Pindah",
  SURAT_USAHA:       "Surat Usaha",
  LAINNYA:           "Lainnya",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DIAJUKAN:  { label: "Diajukan",  variant: "outline" },
  DIPROSES:  { label: "Diproses",  variant: "secondary" },
  DISETUJUI: { label: "Disetujui", variant: "default" },
  DITOLAK:   { label: "Ditolak",   variant: "destructive" },
};

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Surat {
  id: string;
  nomorSurat: string;
  jenisSurat: string;
  perihal: string;
  isiSurat: string | null;
  status: string;
  tanggalSurat: string;
  tanggalDisetujui: string | null;
  disetujuiOleh: string | null;
  catatan: string | null;
  warga: { id: string; namaLengkap: string; nik: string } | null;
}

interface WargaResult {
  id: string;
  namaLengkap: string;
  nik: string;
}

// ─── Warga selector ────────────────────────────────────────────────────────────

function WargaSelector({
  selected,
  onSelect,
  onClear,
}: {
  selected: WargaResult | null;
  onSelect: (w: WargaResult) => void;
  onClear: () => void;
}) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<WargaResult[]>([]);
  const [open, setOpen]       = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef          = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/v1/warga?search=${encodeURIComponent(query)}&limit=8`);
      const json = await res.json();
      if (json.success) setResults(json.data ?? []);
    }, 300);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-blue-50 border-blue-200">
        <User className="h-4 w-4 text-blue-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{selected.namaLengkap}</p>
          <p className="text-xs text-muted-foreground">NIK: {selected.nik}</p>
        </div>
        <button onClick={onClear} className="p-0.5 hover:bg-blue-100 rounded">
          <X className="h-4 w-4 text-blue-600" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Cari nama atau NIK warga..."
          className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {results.map((w) => (
            <button
              key={w.id}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 border-b last:border-0"
              onClick={() => { onSelect(w); setQuery(""); setOpen(false); }}
            >
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium">{w.namaLengkap}</p>
                <p className="text-xs text-muted-foreground">NIK: {w.nik}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg px-3 py-2 text-sm text-muted-foreground">
          Warga tidak ditemukan
        </div>
      )}
    </div>
  );
}

// ─── Approve modal ─────────────────────────────────────────────────────────────

function ApproveModal({
  surat,
  onConfirm,
  onClose,
}: {
  surat: Surat;
  onConfirm: (disetujuiOleh: string) => void;
  onClose: () => void;
}) {
  const [nama, setNama] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-semibold text-base">Setujui Surat</h3>
        <p className="text-sm text-muted-foreground">
          Surat: <strong>{surat.perihal}</strong> — {surat.warga?.namaLengkap ?? "—"}
        </p>
        <div>
          <label className="text-sm font-medium block mb-1">Nama yang Menyetujui</label>
          <Input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Nama ketua RT / pejabat yang menandatangani"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1">Kosongkan untuk menggunakan nama akun Anda</p>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => onConfirm(nama.trim())}
          >
            <CheckCircle className="h-4 w-4 mr-1" /> Setujui & Buat Nomor
          </Button>
          <Button variant="outline" onClick={onClose}>Batal</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page guard ────────────────────────────────────────────────────────────────

export default function SuratPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RT_ADMIN, UserRole.RW_ADMIN, UserRole.SUPER_ADMIN]}>
      <SuratContent />
    </RoleGuard>
  );
}

// ─── Main content ──────────────────────────────────────────────────────────────

function SuratContent() {
  const [data, setData]               = useState<Surat[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [jenisFilter, setJenisFilter] = useState("");
  const [showForm, setShowForm]       = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create form state
  const [selectedWarga, setSelectedWarga] = useState<WargaResult | null>(null);
  const [approveTarget, setApproveTarget] = useState<Surat | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (search)       params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (jenisFilter)  params.set("jenis", jenisFilter);

    const res = await fetch(`/api/v1/surat?${params}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }, [search, statusFilter, jenisFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/surat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wargaId:   selectedWarga?.id ?? null,
        jenisSurat: form.get("jenisSurat"),
        perihal:   form.get("perihal"),
        isiSurat:  form.get("isiSurat") || null,
        catatan:   form.get("catatan") || null,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setSelectedWarga(null);
      fetchData();
    }
  }

  // Uses the [id] PATCH route which has proper nomor generation
  async function handleStatusChange(id: string, status: string, disetujuiOleh?: string) {
    setActionLoading(id);
    await fetch(`/api/v1/surat/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, disetujuiOleh }),
    });
    setActionLoading(null);
    setApproveTarget(null);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus surat ini?")) return;
    setActionLoading(id);
    await fetch(`/api/v1/surat/${id}`, { method: "DELETE" });
    setActionLoading(null);
    fetchData();
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" /> Manajemen Surat
          </h1>
          <p className="text-sm text-muted-foreground">Kelola semua surat keterangan &amp; pengantar</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Buat Surat
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buat Surat Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Warga selector — full width */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium block mb-1.5">Warga Pemohon</label>
                <WargaSelector
                  selected={selectedWarga}
                  onSelect={setSelectedWarga}
                  onClear={() => setSelectedWarga(null)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Jenis Surat *</label>
                <select name="jenisSurat" required className="w-full mt-1 border rounded-md px-3 py-2 text-sm">
                  {Object.entries(JENIS_SURAT_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Perihal *</label>
                <Input name="perihal" required placeholder="Perihal surat" className="mt-1" />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Isi Surat / Keterangan Tambahan</label>
                <textarea
                  name="isiSurat"
                  rows={3}
                  className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                  placeholder="Keterangan tambahan (opsional)..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Catatan Internal</label>
                <Input name="catatan" placeholder="Catatan untuk admin (opsional)" className="mt-1" />
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit">Simpan Surat</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setSelectedWarga(null); }}>
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor, perihal, nama warga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="">Semua Status</option>
            <option value="DIAJUKAN">Diajukan</option>
            <option value="DIPROSES">Diproses</option>
            <option value="DISETUJUI">Disetujui</option>
            <option value="DITOLAK">Ditolak</option>
          </select>
          <select
            value={jenisFilter}
            onChange={(e) => setJenisFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="">Semua Jenis</option>
            {Object.entries(JENIS_SURAT_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Surat List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 animate-pulse bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Belum ada surat yang sesuai filter
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((surat) => {
            const statusCfg = STATUS_CONFIG[surat.status] ?? STATUS_CONFIG.DIAJUKAN;
            const isLoading = actionLoading === surat.id;
            return (
              <Card key={surat.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    {/* Left: info */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium text-gray-700">{surat.nomorSurat}</span>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                        <Badge variant="outline">{JENIS_SURAT_LABELS[surat.jenisSurat] ?? surat.jenisSurat}</Badge>
                      </div>
                      <p className="font-semibold">{surat.perihal}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        {surat.warga && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {surat.warga.namaLengkap}
                          </span>
                        )}
                        <span>Dibuat: {formatDate(surat.tanggalSurat)}</span>
                        {surat.tanggalDisetujui && (
                          <span>Disetujui: {formatDate(surat.tanggalDisetujui)} oleh {surat.disetujuiOleh}</span>
                        )}
                      </div>
                      {surat.catatan && (
                        <p className="text-xs text-muted-foreground italic">Catatan: {surat.catatan}</p>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {/* Cetak — only for DISETUJUI */}
                      {surat.status === "DISETUJUI" && (
                        <Link href={`/surat/${surat.id}/cetak`} target="_blank">
                          <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50">
                            <Printer className="h-3.5 w-3.5 mr-1" /> Cetak
                          </Button>
                        </Link>
                      )}

                      {/* Approval / rejection actions */}
                      {(surat.status === "DIAJUKAN" || surat.status === "DIPROSES") && (
                        <>
                          {surat.status === "DIAJUKAN" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isLoading}
                              onClick={() => handleStatusChange(surat.id, "DIPROSES")}
                            >
                              <Clock className="h-3 w-3 mr-1" /> Proses
                            </Button>
                          )}
                          <Button
                            size="sm"
                            disabled={isLoading}
                            onClick={() => setApproveTarget(surat)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isLoading}
                            onClick={() => handleStatusChange(surat.id, "DITOLAK")}
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Tolak
                          </Button>
                        </>
                      )}

                      {/* Delete — for DITOLAK or DIAJUKAN */}
                      {(surat.status === "DITOLAK" || surat.status === "DIAJUKAN") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          disabled={isLoading}
                          onClick={() => handleDelete(surat.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Approve modal */}
      {approveTarget && (
        <ApproveModal
          surat={approveTarget}
          onConfirm={(nama) => handleStatusChange(approveTarget.id, "DISETUJUI", nama || undefined)}
          onClose={() => setApproveTarget(null)}
        />
      )}
    </div>
  );
}

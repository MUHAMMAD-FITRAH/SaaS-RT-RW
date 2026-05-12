"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Receipt, Plus, CheckCircle, X, Clock, Upload, Eye, Loader2,
  ChevronDown, ChevronUp, AlertCircle, RefreshCw, Camera,
} from "lucide-react";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface JenisIuran {
  id: string;
  nama: string;
  jumlah: number;
  periode: string;
  deskripsi: string | null;
  isJumlahFleksibel: boolean;
  isActive: boolean;
}

interface Payment {
  id: string;
  warga: { id: string; namaLengkap: string };
  iuranType: { id: string; nama: string };
  jumlah: number;
  bulan: number;
  tahun: number;
  tanggalBayar: string | null;
  metodeBayar: string | null;
  buktiUrl: string | null;
  catatan: string | null;
  pencatat: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BULAN_LABEL = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

function paymentStatus(p: Payment): "LUNAS" | "MENUNGGU" | "BELUM" {
  if (p.tanggalBayar) return "LUNAS";
  if (p.buktiUrl) return "MENUNGGU";
  return "BELUM";
}

const PERIODE_LABEL: Record<string, string> = {
  BULANAN: "Bulanan",
  TAHUNAN: "Tahunan",
  INSIDENTAL: "Insidental",
  DONASI: "Donasi",
};

// ─── BuktiModal ─────────────────────────────────────────────────────────────

function BuktiModal({
  payment,
  onClose,
  onConfirm,
  onReject,
}: {
  payment: Payment;
  onClose: () => void;
  onConfirm: (id: string, metode: string) => void;
  onReject: (id: string) => void;
}) {
  const [metode, setMetode] = useState("TRANSFER");
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Verifikasi Bukti Transfer</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="text-sm space-y-1">
          <p><span className="text-muted-foreground">Warga:</span> <strong>{payment.warga.namaLengkap}</strong></p>
          <p><span className="text-muted-foreground">Jumlah:</span> <strong>{formatCurrency(payment.jumlah)}</strong></p>
          <p><span className="text-muted-foreground">Periode:</span> {BULAN_LABEL[payment.bulan - 1]} {payment.tahun}</p>
        </div>
        {payment.buktiUrl && (
          <div className="rounded-lg overflow-hidden border">
            <Image src={payment.buktiUrl} alt="Bukti Transfer" width={400} height={300}
              className="w-full object-contain max-h-64" />
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium">Metode Pembayaran</label>
          <Select value={metode} onChange={(e) => setMetode(e.target.value)}>
            <option value="TRANSFER">Transfer Bank</option>
            <option value="TUNAI">Tunai</option>
            <option value="EWALLET">E-Wallet</option>
            <option value="LAINNYA">Lainnya</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={async () => { setBusy(true); await onConfirm(payment.id, metode); setBusy(false); }} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Konfirmasi Lunas
          </Button>
          <Button variant="destructive" onClick={() => onReject(payment.id)} disabled={busy}>
            Tolak
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── CatatBayarModal ─────────────────────────────────────────────────────────

function CatatBayarModal({
  payment,
  onClose,
  onSave,
}: {
  payment: Payment;
  onClose: () => void;
  onSave: (id: string, metode: string, jumlah?: number, buktiUrl?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [metode, setMetode] = useState("TUNAI");
  const [jumlah, setJumlah] = useState(String(payment.jumlah));
  const [uploading, setUploading] = useState(false);
  const [buktiUrl, setBuktiUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "bukti");
    const res = await fetch("/api/v1/upload", { method: "POST", body: fd });
    const d = await res.json();
    setUploading(false);
    if (d.data?.url) setBuktiUrl(d.data.url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Catat Pembayaran</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground">
          {payment.warga.namaLengkap} — {BULAN_LABEL[payment.bulan - 1]} {payment.tahun}
        </p>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Jumlah (Rp)</label>
            <Input type="number" value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Metode Pembayaran</label>
            <Select value={metode} onChange={(e) => setMetode(e.target.value)}>
              <option value="TUNAI">Tunai</option>
              <option value="TRANSFER">Transfer Bank</option>
              <option value="EWALLET">E-Wallet / QRIS</option>
              <option value="LAINNYA">Lainnya</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Bukti (opsional)</label>
            {buktiUrl ? (
              <div className="flex items-center gap-2">
                <Image src={buktiUrl} alt="Bukti" width={60} height={60} className="w-14 h-14 object-cover rounded border" />
                <button className="text-xs text-red-500" onClick={() => setBuktiUrl(null)}>Hapus</button>
              </div>
            ) : (
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {uploading ? "Mengupload..." : "Upload Bukti Transfer"}
              </button>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" disabled={busy || !jumlah} onClick={async () => {
            setBusy(true);
            await onSave(payment.id, metode, Number(jumlah), buktiUrl ?? undefined);
            setBusy(false);
          }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Simpan
          </Button>
          <Button variant="outline" onClick={onClose}>Batal</Button>
        </div>
      </div>
    </div>
  );
}

// ─── TambahJenisForm ─────────────────────────────────────────────────────────

function TambahJenisForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ nama: "", jumlah: "", periode: "BULANAN", deskripsi: "", isJumlahFleksibel: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/v1/iuran", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_type",
        nama: form.nama,
        jumlah: form.isJumlahFleksibel ? 0 : parseFloat(form.jumlah),
        periode: form.periode,
        deskripsi: form.deskripsi || null,
        isJumlahFleksibel: form.isJumlahFleksibel,
      }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(d.error || "Gagal menyimpan"); return; }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-xl border space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Nama Iuran *</label>
          <Input placeholder="Contoh: Iuran Kebersihan" value={form.nama}
            onChange={(e) => setForm(p => ({ ...p, nama: e.target.value }))} required />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Periode</label>
          <Select value={form.periode} onChange={(e) => setForm(p => ({ ...p, periode: e.target.value }))}>
            <option value="BULANAN">Bulanan</option>
            <option value="TAHUNAN">Tahunan</option>
            <option value="INSIDENTAL">Insidental / Kegiatan</option>
            <option value="DONASI">Donasi / Sukarela</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Jumlah (Rp) {form.isJumlahFleksibel && <span className="text-muted-foreground font-normal">(Fleksibel)</span>}
          </label>
          <Input type="number" placeholder="0" value={form.jumlah}
            disabled={form.isJumlahFleksibel}
            onChange={(e) => setForm(p => ({ ...p, jumlah: e.target.value }))}
            required={!form.isJumlahFleksibel} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Deskripsi (opsional)</label>
          <Input placeholder="Keterangan singkat" value={form.deskripsi}
            onChange={(e) => setForm(p => ({ ...p, deskripsi: e.target.value }))} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.isJumlahFleksibel}
          onChange={(e) => setForm(p => ({ ...p, isJumlahFleksibel: e.target.checked, jumlah: e.target.checked ? "" : p.jumlah }))}
          className="rounded" />
        Jumlah fleksibel (donasi / warga tentukan sendiri)
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Simpan Jenis Iuran
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>Batal</Button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IuranPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RT_ADMIN, UserRole.RW_ADMIN]}>
      <IuranContent />
    </RoleGuard>
  );
}

function IuranContent() {
  const [jenisIuranList, setJenisIuranList] = useState<JenisIuran[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJenis, setSelectedJenis] = useState<string>("");
  const [filterBulan, setFilterBulan] = useState(String(new Date().getMonth() + 1));
  const [filterTahun, setFilterTahun] = useState(String(new Date().getFullYear()));
  const [showJenisForm, setShowJenisForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [buktiModalPayment, setBuktiModalPayment] = useState<Payment | null>(null);
  const [catatModalPayment, setCatatModalPayment] = useState<Payment | null>(null);
  const [searchWarga, setSearchWarga] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "LUNAS" | "MENUNGGU" | "BELUM">("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ bulan: filterBulan, tahun: filterTahun, limit: "200" });
    const res = await fetch(`/api/v1/iuran?${params}`);
    const json = await res.json();
    if (json.success) {
      setJenisIuranList(json.data.iuranTypes || []);
      setPayments(json.data.payments || []);
    }
    setLoading(false);
  }, [filterBulan, filterTahun]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleGenerate() {
    if (!selectedJenis) return;
    setGenerating(true);
    await fetch("/api/v1/iuran", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        iuranTypeId: selectedJenis,
        bulan: parseInt(filterBulan),
        tahun: parseInt(filterTahun),
      }),
    });
    setGenerating(false);
    fetchData();
  }

  async function handleConfirm(id: string, metode: string) {
    await fetch(`/api/v1/iuran/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", metodeBayar: metode }),
    });
    setBuktiModalPayment(null);
    fetchData();
  }

  async function handleReject(id: string) {
    await fetch(`/api/v1/iuran/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    setBuktiModalPayment(null);
    fetchData();
  }

  async function handleCatatBayar(id: string, metode: string, jumlah?: number, buktiUrl?: string) {
    await fetch("/api/v1/iuran", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "record_payment",
        iuranTypeId: catatModalPayment?.iuranType.id,
        wargaId: catatModalPayment?.warga.id,
        bulan: catatModalPayment?.bulan,
        tahun: catatModalPayment?.tahun,
        jumlah: jumlah ?? catatModalPayment?.jumlah,
        metodeBayar: metode,
        buktiUrl: buktiUrl ?? null,
      }),
    });
    setCatatModalPayment(null);
    fetchData();
  }

  // Filter payments
  const filteredPayments = payments
    .filter((p) => !selectedJenis || p.iuranType.id === selectedJenis)
    .filter((p) => !searchWarga || p.warga.namaLengkap.toLowerCase().includes(searchWarga.toLowerCase()))
    .filter((p) => !filterStatus || paymentStatus(p) === filterStatus);

  // Stats
  const statsPayments = selectedJenis ? payments.filter((p) => p.iuranType.id === selectedJenis) : payments;
  const totalLunas = statsPayments.filter((p) => paymentStatus(p) === "LUNAS").length;
  const totalMenunggu = statsPayments.filter((p) => paymentStatus(p) === "MENUNGGU").length;
  const totalBelum = statsPayments.filter((p) => paymentStatus(p) === "BELUM").length;
  const totalTerkumpul = statsPayments.filter((p) => paymentStatus(p) === "LUNAS").reduce((s, p) => s + p.jumlah, 0);

  return (
    <div className="space-y-6">
      {/* Modals */}
      {buktiModalPayment && (
        <BuktiModal
          payment={buktiModalPayment}
          onClose={() => setBuktiModalPayment(null)}
          onConfirm={handleConfirm}
          onReject={handleReject}
        />
      )}
      {catatModalPayment && (
        <CatatBayarModal
          payment={catatModalPayment}
          onClose={() => setCatatModalPayment(null)}
          onSave={handleCatatBayar}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Iuran Warga</h1>
          <p className="text-muted-foreground text-sm">Kelola jenis iuran dan pembayaran</p>
        </div>
        <Button onClick={() => setShowJenisForm(!showJenisForm)}>
          {showJenisForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showJenisForm ? "Batal" : "Tambah Jenis Iuran"}
        </Button>
      </div>

      {/* Tambah Jenis Form */}
      {showJenisForm && (
        <TambahJenisForm onDone={() => { setShowJenisForm(false); fetchData(); }} />
      )}

      {/* Jenis Iuran Cards */}
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Jenis Iuran</p>
        {jenisIuranList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
            <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Belum ada jenis iuran. Tambah dulu.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {jenisIuranList.map((jenis) => (
              <div
                key={jenis.id}
                onClick={() => setSelectedJenis(selectedJenis === jenis.id ? "" : jenis.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedJenis === jenis.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="font-semibold text-sm">{jenis.nama}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0 ml-1">
                    {PERIODE_LABEL[jenis.periode] || jenis.periode}
                  </Badge>
                </div>
                <p className="text-lg font-bold text-primary">
                  {jenis.isJumlahFleksibel ? "Sukarela" : formatCurrency(jenis.jumlah)}
                </p>
                {jenis.deskripsi && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{jenis.deskripsi}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Lunas", value: totalLunas, color: "text-green-600", bg: "bg-green-50" },
          { label: "Menunggu Konfirmasi", value: totalMenunggu, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Belum Bayar", value: totalBelum, color: "text-red-600", bg: "bg-red-50" },
          { label: "Terkumpul", value: formatCurrency(totalTerkumpul), color: "text-blue-600", bg: "bg-blue-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Payment Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base">Pembayaran Iuran</CardTitle>
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                placeholder="Cari nama warga..."
                value={searchWarga}
                onChange={(e) => setSearchWarga(e.target.value)}
                className="w-40 h-8 text-sm"
              />
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "" | "LUNAS" | "MENUNGGU" | "BELUM")} className="w-36 h-8 text-sm">
                <option value="">Semua Status</option>
                <option value="LUNAS">Lunas</option>
                <option value="MENUNGGU">Menunggu Konfirmasi</option>
                <option value="BELUM">Belum Bayar</option>
              </Select>
              <Select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} className="w-32 h-8 text-sm">
                {BULAN_LABEL.map((b, i) => (
                  <option key={i + 1} value={String(i + 1)}>{b}</option>
                ))}
              </Select>
              <Select value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)} className="w-20 h-8 text-sm">
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </Select>
              {selectedJenis && (
                <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
                  {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                  Generate Tagihan
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse bg-gray-100 rounded" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Belum ada data pembayaran{selectedJenis ? " untuk jenis iuran ini" : ""}</p>
              {selectedJenis && (
                <Button variant="outline" size="sm" className="mt-3" onClick={handleGenerate} disabled={generating}>
                  {generating ? "Generating..." : "Generate Tagihan Sekarang"}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 px-2 font-medium">Warga</th>
                    <th className="py-3 px-2 font-medium hidden sm:table-cell">Jenis</th>
                    <th className="py-3 px-2 font-medium">Status</th>
                    <th className="py-3 px-2 font-medium text-right">Jumlah</th>
                    <th className="py-3 px-2 font-medium hidden md:table-cell">Tgl Bayar</th>
                    <th className="py-3 px-2 font-medium hidden lg:table-cell">Metode</th>
                    <th className="py-3 px-2 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => {
                    const status = paymentStatus(p);
                    return (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="py-2.5 px-2 font-medium">{p.warga.namaLengkap}</td>
                        <td className="py-2.5 px-2 text-muted-foreground hidden sm:table-cell text-xs">{p.iuranType.nama}</td>
                        <td className="py-2.5 px-2">
                          {status === "LUNAS" && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" /> Lunas
                            </Badge>
                          )}
                          {status === "MENUNGGU" && (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                              <Clock className="h-3 w-3 mr-1" /> Menunggu
                            </Badge>
                          )}
                          {status === "BELUM" && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" /> Belum
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right font-medium">{formatCurrency(p.jumlah)}</td>
                        <td className="py-2.5 px-2 text-muted-foreground text-xs hidden md:table-cell">
                          {p.tanggalBayar ? new Date(p.tanggalBayar).toLocaleDateString("id-ID") : "-"}
                        </td>
                        <td className="py-2.5 px-2 text-muted-foreground text-xs hidden lg:table-cell">
                          {p.metodeBayar || "-"}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex gap-1 justify-end">
                            {status === "MENUNGGU" && (
                              <Button size="sm" variant="outline" className="text-yellow-700 border-yellow-300 h-7 text-xs"
                                onClick={() => setBuktiModalPayment(p)}>
                                <Eye className="h-3 w-3 mr-1" /> Verifikasi
                              </Button>
                            )}
                            {status === "BELUM" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => setCatatModalPayment(p)}>
                                Catat Bayar
                              </Button>
                            )}
                            {status === "LUNAS" && p.buktiUrl && (
                              <a href={p.buktiUrl} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="ghost" className="h-7 text-xs">
                                  <Eye className="h-3 w-3 mr-1" /> Bukti
                                </Button>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-3 text-right">
                Menampilkan {filteredPayments.length} dari {payments.length} pembayaran
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

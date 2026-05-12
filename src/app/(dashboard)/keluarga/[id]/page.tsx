"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Users, Home, Edit, Save, X, Trash2,
  ExternalLink, User, Phone, Briefcase
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface WargaAnggota {
  id: string;
  nik: string;
  namaLengkap: string;
  jenisKelamin: string | null;
  tanggalLahir: string | null;
  pekerjaan: string | null;
  nomorHP: string | null;
  statusAktif: string;
  statusTinggal: string;
}

interface KeluargaDetail {
  id: string;
  nomorKK: string;
  kepalaKeluarga: string;
  createdAt: string;
  rumah: {
    id: string;
    nomorRumah: string;
    blok: string | null;
    alamat: string;
    statusHuni: string;
  };
  anggota: WargaAnggota[];
}

const STATUS_AKTIF_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  AKTIF: "default", PINDAH: "secondary", MENINGGAL: "destructive", TIDAK_AKTIF: "secondary",
};
const STATUS_AKTIF_LABEL: Record<string, string> = {
  AKTIF: "Aktif", PINDAH: "Pindah", MENINGGAL: "Meninggal", TIDAK_AKTIF: "Tidak Aktif",
};
const JENIS_KELAMIN_LABEL: Record<string, string> = {
  LAKI_LAKI: "L", PEREMPUAN: "P",
};

function hitungUmur(tanggalLahir: string): string {
  const today = new Date();
  const birth = new Date(tanggalLahir);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age} thn`;
}

export default function KeluargaDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [keluarga, setKeluarga] = useState<KeluargaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ nomorKK: "", kepalaKeluarga: "" });
  const [rumahOptions, setRumahOptions] = useState<{ id: string; nomorRumah: string; blok: string | null }[]>([]);
  const [selectedRumahId, setSelectedRumahId] = useState("");

  const fetchKeluarga = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/keluarga/${id}`);
    const d = await res.json();
    if (d.success) {
      setKeluarga(d.data);
      setForm({ nomorKK: d.data.nomorKK, kepalaKeluarga: d.data.kepalaKeluarga });
      setSelectedRumahId(d.data.rumah?.id || "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchKeluarga(); }, [fetchKeluarga]);

  useEffect(() => {
    if (editing) {
      fetch("/api/v1/rumah?limit=200").then(r => r.json()).then(d => {
        if (d.success) setRumahOptions(d.data);
      });
    }
  }, [editing]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/v1/keluarga/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, rumahId: selectedRumahId }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Gagal menyimpan"); return; }
    setSuccess("Data keluarga berhasil diperbarui");
    setEditing(false);
    fetchKeluarga();
  }

  async function handleDelete() {
    if (!confirm("Hapus data keluarga ini? Warga yang terkait tidak akan ikut terhapus.")) return;
    setDeleting(true);
    const res = await fetch(`/api/v1/keluarga/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/keluarga");
    } else {
      const d = await res.json();
      setError(d.error || "Gagal menghapus");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-8 w-48 animate-pulse bg-gray-200 rounded" />
        <div className="h-40 animate-pulse bg-gray-200 rounded" />
        <div className="h-64 animate-pulse bg-gray-200 rounded" />
      </div>
    );
  }

  if (!keluarga) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Data keluarga tidak ditemukan</p>
        <Link href="/keluarga"><Button variant="outline" className="mt-4">Kembali</Button></Link>
      </div>
    );
  }

  const aktif = keluarga.anggota.filter(a => a.statusAktif === "AKTIF").length;
  const pindah = keluarga.anggota.filter(a => a.statusAktif === "PINDAH").length;
  const lakilaki = keluarga.anggota.filter(a => a.jenisKelamin === "LAKI_LAKI").length;
  const perempuan = keluarga.anggota.filter(a => a.jenisKelamin === "PEREMPUAN").length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/keluarga">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Keluarga {keluarga.kepalaKeluarga}</h1>
            <p className="text-muted-foreground text-sm font-mono mt-0.5">KK: {keluarga.nomorKK}</p>
          </div>
        </div>
        {!editing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-1" /> {deleting ? "..." : "Hapus"}
            </Button>
          </div>
        )}
      </div>

      {success && <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">{success}</div>}
      {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-3 pb-3 text-center">
          <div className="text-xl font-bold">{keluarga.anggota.length}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3 text-center">
          <div className="text-xl font-bold text-green-600">{aktif}</div>
          <div className="text-xs text-muted-foreground">Aktif</div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3 text-center">
          <div className="text-xl font-bold text-blue-600">{lakilaki}</div>
          <div className="text-xs text-muted-foreground">Laki-laki</div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3 text-center">
          <div className="text-xl font-bold text-pink-600">{perempuan}</div>
          <div className="text-xs text-muted-foreground">Perempuan</div>
        </CardContent></Card>
      </div>

      {/* Info KK */}
      {!editing ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Informasi Kartu Keluarga</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Nomor KK</dt>
                <dd className="font-mono font-medium mt-0.5">{keluarga.nomorKK}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Kepala Keluarga</dt>
                <dd className="font-medium mt-0.5">{keluarga.kepalaKeluarga}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Terdaftar</dt>
                <dd className="font-medium mt-0.5">{formatDate(keluarga.createdAt)}</dd>
              </div>
            </dl>
            {/* Link ke Rumah */}
            <div className="pt-2 border-t">
              <dt className="text-sm text-muted-foreground mb-2">Tempat Tinggal</dt>
              <Link href={`/rumah/${keluarga.rumah.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer group">
                  <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Home className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm group-hover:text-blue-700">
                      Rumah No. {keluarga.rumah.nomorRumah}
                      {keluarga.rumah.blok ? ` Blok ${keluarga.rumah.blok}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{keluarga.rumah.alamat}</p>
                  </div>
                  <Badge variant={keluarga.rumah.statusHuni === "DIHUNI" ? "success" : "secondary"} className="flex-shrink-0 text-xs">
                    {keluarga.rumah.statusHuni === "DIHUNI" ? "Dihuni" : keluarga.rumah.statusHuni === "TIDAK_DIHUNI" ? "Kosong" : "Disewakan"}
                  </Badge>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 flex-shrink-0" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Edit Data Keluarga</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nomor KK *</label>
                  <Input value={form.nomorKK} onChange={(e) => setForm(p => ({ ...p, nomorKK: e.target.value }))} maxLength={16} required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Kepala Keluarga *</label>
                  <Input value={form.kepalaKeluarga} onChange={(e) => setForm(p => ({ ...p, kepalaKeluarga: e.target.value }))} required />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium">Rumah *</label>
                  <Select value={selectedRumahId} onChange={(e) => setSelectedRumahId(e.target.value)} required>
                    <option value="">Pilih Rumah</option>
                    {rumahOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        No. {r.nomorRumah}{r.blok ? ` Blok ${r.blok}` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-1" /> {saving ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4 mr-1" /> Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Daftar Anggota */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Anggota Keluarga ({keluarga.anggota.length} orang)
            </CardTitle>
            <Link href={`/warga/tambah`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3 w-3 mr-1" /> Tambah Warga
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {keluarga.anggota.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada anggota keluarga terdaftar</p>
          ) : (
            <div className="space-y-2">
              {keluarga.anggota.map((w) => (
                <Link key={w.id} href={`/warga/${w.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer group">
                    {/* Avatar */}
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${
                      w.jenisKelamin === "LAKI_LAKI" ? "bg-blue-100 text-blue-700" :
                      w.jenisKelamin === "PEREMPUAN" ? "bg-pink-100 text-pink-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {w.jenisKelamin ? JENIS_KELAMIN_LABEL[w.jenisKelamin] : <User className="h-4 w-4" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm group-hover:text-blue-700 truncate">{w.namaLengkap}</p>
                        {w.namaLengkap === keluarga.kepalaKeluarga && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">KK</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground font-mono">{w.nik}</span>
                        {w.tanggalLahir && (
                          <span className="text-xs text-muted-foreground">{hitungUmur(w.tanggalLahir)}</span>
                        )}
                      </div>
                    </div>

                    {/* Pekerjaan & HP */}
                    <div className="hidden sm:block text-right mr-2">
                      {w.pekerjaan && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Briefcase className="h-3 w-3" />{w.pekerjaan}
                        </div>
                      )}
                      {w.nomorHP && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{w.nomorHP}
                        </div>
                      )}
                    </div>

                    <Badge
                      variant={STATUS_AKTIF_BADGE[w.statusAktif] || "secondary"}
                      className="text-xs flex-shrink-0"
                    >
                      {STATUS_AKTIF_LABEL[w.statusAktif] || w.statusAktif}
                    </Badge>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pindah > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {pindah} anggota sudah pindah tidak ditampilkan di atas
        </p>
      )}
    </div>
  );
}

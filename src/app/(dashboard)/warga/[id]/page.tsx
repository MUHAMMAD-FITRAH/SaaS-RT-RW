"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, Edit, ExternalLink, Home, Save, Trash2, User, Users, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface WargaDetail {
  id: string;
  nik: string;
  namaLengkap: string;
  foto: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: string | null;
  golonganDarah: string | null;
  agama: string | null;
  statusPerkawinan: string | null;
  pekerjaan: string | null;
  pendidikan: string | null;
  kewarganegaraan: string | null;
  nomorHP: string | null;
  email: string | null;
  statusTinggal: string;
  statusAktif: string;
  keluargaId: string | null;
  createdAt: string;
  keluarga: {
    id: string;
    nomorKK: string;
    kepalaKeluarga: string;
    rumah: { id: string; nomorRumah: string; blok: string | null; alamat: string } | null;
  } | null;
  iuranPayments: Array<{
    id: string;
    bulan: number;
    tahun: number;
    jumlah: number;
    tanggalBayar: string | null;
    iuranType: { nama: string };
  }>;
}

const LABEL_MAP: Record<string, string> = {
  LAKI_LAKI: "Laki-laki", PEREMPUAN: "Perempuan",
  BELUM_KAWIN: "Belum Kawin", KAWIN: "Kawin", CERAI_HIDUP: "Cerai Hidup", CERAI_MATI: "Cerai Mati",
  TETAP: "Tetap", KONTRAK: "Kontrak", KOST: "Kost",
  AKTIF: "Aktif", PINDAH: "Pindah", MENINGGAL: "Meninggal", TIDAK_AKTIF: "Tidak Aktif",
  ISLAM: "Islam", KRISTEN: "Kristen", KATOLIK: "Katolik", HINDU: "Hindu", BUDDHA: "Buddha", KONGHUCU: "Konghucu", LAINNYA: "Lainnya",
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function WargaFotoUploader({
  wargaId,
  currentFoto,
  namaLengkap,
  jenisKelamin,
  onUploaded,
}: {
  wargaId: string;
  currentFoto: string | null;
  namaLengkap: string;
  jenisKelamin: string | null;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentFoto);
  const bgColor = jenisKelamin === "LAKI_LAKI" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700";

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "warga");
    fd.append("targetId", wargaId);

    const res = await fetch("/api/v1/upload", { method: "POST", body: fd });
    const d = await res.json();
    setUploading(false);
    if (res.ok && d.data?.url) onUploaded(d.data.url);
  }

  return (
    <div className="relative group w-20 h-20 shrink-0">
      {preview ? (
        <Image src={preview} alt={namaLengkap} width={80} height={80}
          className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow" />
      ) : (
        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold ring-4 ring-white shadow ${bgColor}`}>
          {getInitials(namaLengkap)}
        </div>
      )}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Ganti foto"
      >
        <Camera className="h-5 w-5 text-white" />
      </button>
      {uploading && (
        <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50">
          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  );
}

export default function WargaDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [warga, setWarga] = useState<WargaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get("edit") === "true");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleFotoUploaded(url: string) {
    setWarga((prev) => prev ? { ...prev, foto: url } : prev);
  }

  // Edit form state
  const [form, setForm] = useState<Record<string, string>>({});

  const fetchWarga = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/warga/${id}`);
    const d = await res.json();
    if (d.success) {
      setWarga(d.data);
      setForm({
        nik: d.data.nik || "",
        namaLengkap: d.data.namaLengkap || "",
        tempatLahir: d.data.tempatLahir || "",
        tanggalLahir: d.data.tanggalLahir ? d.data.tanggalLahir.split("T")[0] : "",
        jenisKelamin: d.data.jenisKelamin || "",
        golonganDarah: d.data.golonganDarah || "",
        agama: d.data.agama || "",
        statusPerkawinan: d.data.statusPerkawinan || "",
        pekerjaan: d.data.pekerjaan || "",
        pendidikan: d.data.pendidikan || "",
        kewarganegaraan: d.data.kewarganegaraan || "WNI",
        nomorHP: d.data.nomorHP || "",
        email: d.data.email || "",
        statusTinggal: d.data.statusTinggal || "TETAP",
        statusAktif: d.data.statusAktif || "AKTIF",
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchWarga(); }, [fetchWarga]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const body: Record<string, unknown> = { ...form };
    // Clean empty strings to undefined
    for (const key of Object.keys(body)) {
      if (body[key] === "") body[key] = undefined;
    }

    const res = await fetch(`/api/v1/warga/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Gagal menyimpan");
      return;
    }

    setSuccess("Data warga berhasil diperbarui");
    setEditing(false);
    fetchWarga();
  }

  async function handleDelete() {
    if (!confirm("Apakah Anda yakin ingin menonaktifkan warga ini?")) return;
    setDeleting(true);

    const res = await fetch(`/api/v1/warga/${id}`, { method: "DELETE" });
    setDeleting(false);

    if (res.ok) {
      router.push("/warga");
    } else {
      const data = await res.json();
      setError(data.error || "Gagal menghapus");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse bg-gray-200 rounded" />
        <div className="h-64 animate-pulse bg-gray-200 rounded" />
      </div>
    );
  }

  if (!warga) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Warga tidak ditemukan</p>
        <Link href="/warga"><Button variant="outline" className="mt-4">Kembali</Button></Link>
      </div>
    );
  }

  // VIEW MODE
  if (!editing) {
    const fields = [
      { label: "NIK", value: warga.nik },
      { label: "Nama Lengkap", value: warga.namaLengkap },
      { label: "Tempat Lahir", value: warga.tempatLahir },
      { label: "Tanggal Lahir", value: warga.tanggalLahir ? formatDate(warga.tanggalLahir) : null },
      { label: "Jenis Kelamin", value: warga.jenisKelamin ? LABEL_MAP[warga.jenisKelamin] : null },
      { label: "Golongan Darah", value: warga.golonganDarah },
      { label: "Agama", value: warga.agama ? LABEL_MAP[warga.agama] || warga.agama : null },
      { label: "Status Perkawinan", value: warga.statusPerkawinan ? LABEL_MAP[warga.statusPerkawinan] : null },
      { label: "Pekerjaan", value: warga.pekerjaan },
      { label: "Pendidikan", value: warga.pendidikan },
      { label: "Kewarganegaraan", value: warga.kewarganegaraan },
      { label: "No. HP", value: warga.nomorHP },
      { label: "Email", value: warga.email },
      { label: "Status Tinggal", value: LABEL_MAP[warga.statusTinggal] },
      { label: "Terdaftar", value: formatDate(warga.createdAt) },
    ];

    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/warga">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <WargaFotoUploader
              wargaId={warga.id}
              currentFoto={warga.foto}
              namaLengkap={warga.namaLengkap}
              jenisKelamin={warga.jenisKelamin}
              onUploaded={handleFotoUploaded}
            />
            <div>
              <h1 className="text-2xl font-bold">{warga.namaLengkap}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={warga.statusAktif === "AKTIF" ? "default" : warga.statusAktif === "PINDAH" ? "secondary" : "destructive"}>
                  {LABEL_MAP[warga.statusAktif] || warga.statusAktif}
                </Badge>
                <span className="text-sm text-muted-foreground font-mono">{warga.nik}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Hover foto untuk mengganti</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-1" /> {deleting ? "..." : "Nonaktifkan"}
            </Button>
          </div>
        </div>

        {success && <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">{success}</div>}
        {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Data Pribadi</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.label}>
                  <dt className="text-sm text-muted-foreground">{f.label}</dt>
                  <dd className="text-sm font-medium mt-0.5">{f.value || "-"}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {warga.keluarga && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Data Keluarga & Rumah
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Kartu Keluarga — clickable */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Kartu Keluarga</p>
                <Link href={`/keluarga/${warga.keluarga.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-blue-50 hover:border-blue-200 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium font-mono group-hover:text-blue-700">{warga.keluarga.nomorKK}</p>
                        <p className="text-xs text-muted-foreground">KK: {warga.keluarga.kepalaKeluarga}</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 shrink-0" />
                  </div>
                </Link>
              </div>

              {/* Rumah — clickable */}
              {warga.keluarga.rumah && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Tempat Tinggal</p>
                  <Link href={`/rumah/${warga.keluarga.rumah.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-blue-50 hover:border-blue-200 transition-colors group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Home className="h-4 w-4 text-blue-600 shrink-0" />
                        <div>
                          <p className="text-sm font-medium group-hover:text-blue-700">
                            Rumah No. {warga.keluarga.rumah.nomorRumah}
                            {warga.keluarga.rumah.blok ? ` Blok ${warga.keluarga.rumah.blok}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">{warga.keluarga.rumah.alamat}</p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 shrink-0" />
                    </div>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Riwayat Iuran */}
        {warga.iuranPayments && warga.iuranPayments.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Riwayat Iuran Terakhir</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Jenis</th>
                    <th className="text-left py-2 font-medium">Periode</th>
                    <th className="text-left py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {warga.iuranPayments.map((ip) => (
                    <tr key={ip.id} className="border-b last:border-0">
                      <td className="py-2">{ip.iuranType.nama}</td>
                      <td className="py-2">{ip.bulan}/{ip.tahun}</td>
                      <td className="py-2">
                        <Badge variant={ip.tanggalBayar ? "default" : "destructive"}>
                          {ip.tanggalBayar ? "Lunas" : "Belum Bayar"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // EDIT MODE
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setEditing(false)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Warga</h1>
          <p className="text-muted-foreground">{warga.namaLengkap}</p>
        </div>
      </div>

      {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}

      <form onSubmit={handleSave}>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Data Pribadi</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">NIK *</label>
                  <Input value={form.nik} onChange={(e) => updateField("nik", e.target.value)} maxLength={16} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Lengkap *</label>
                  <Input value={form.namaLengkap} onChange={(e) => updateField("namaLengkap", e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tempat Lahir</label>
                  <Input value={form.tempatLahir} onChange={(e) => updateField("tempatLahir", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal Lahir</label>
                  <Input type="date" value={form.tanggalLahir} onChange={(e) => updateField("tanggalLahir", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jenis Kelamin</label>
                  <Select value={form.jenisKelamin} onChange={(e) => updateField("jenisKelamin", e.target.value)}>
                    <option value="">Pilih</option>
                    <option value="LAKI_LAKI">Laki-laki</option>
                    <option value="PEREMPUAN">Perempuan</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Agama</label>
                  <Select value={form.agama} onChange={(e) => updateField("agama", e.target.value)}>
                    <option value="">Pilih</option>
                    <option value="ISLAM">Islam</option>
                    <option value="KRISTEN">Kristen</option>
                    <option value="KATOLIK">Katolik</option>
                    <option value="HINDU">Hindu</option>
                    <option value="BUDDHA">Buddha</option>
                    <option value="KONGHUCU">Konghucu</option>
                    <option value="LAINNYA">Lainnya</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status Perkawinan</label>
                  <Select value={form.statusPerkawinan} onChange={(e) => updateField("statusPerkawinan", e.target.value)}>
                    <option value="">Pilih</option>
                    <option value="BELUM_KAWIN">Belum Kawin</option>
                    <option value="KAWIN">Kawin</option>
                    <option value="CERAI_HIDUP">Cerai Hidup</option>
                    <option value="CERAI_MATI">Cerai Mati</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pekerjaan</label>
                  <Input value={form.pekerjaan} onChange={(e) => updateField("pekerjaan", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pendidikan</label>
                  <Input value={form.pendidikan} onChange={(e) => updateField("pendidikan", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Golongan Darah</label>
                  <Select value={form.golonganDarah} onChange={(e) => updateField("golonganDarah", e.target.value)}>
                    <option value="">Pilih</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kewarganegaraan</label>
                  <Input value={form.kewarganegaraan} onChange={(e) => updateField("kewarganegaraan", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Kontak & Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nomor HP</label>
                  <Input value={form.nomorHP} onChange={(e) => updateField("nomorHP", e.target.value)} placeholder="08xxxxxxxxxx" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="email@contoh.com" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status Tinggal</label>
                  <Select value={form.statusTinggal} onChange={(e) => updateField("statusTinggal", e.target.value)}>
                    <option value="TETAP">Tetap</option>
                    <option value="KONTRAK">Kontrak</option>
                    <option value="KOST">Kost</option>
                    <option value="LAINNYA">Lainnya</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status Aktif</label>
                  <Select value={form.statusAktif} onChange={(e) => updateField("statusAktif", e.target.value)}>
                    <option value="AKTIF">Aktif</option>
                    <option value="PINDAH">Pindah</option>
                    <option value="MENINGGAL">Meninggal</option>
                    <option value="TIDAK_AKTIF">Tidak Aktif</option>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 mt-6">
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>
            <X className="h-4 w-4 mr-2" /> Batal
          </Button>
        </div>
      </form>
    </div>
  );
}

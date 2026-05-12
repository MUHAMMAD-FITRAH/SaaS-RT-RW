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
  ArrowLeft, Home, Users, Car, Edit, Save, X, Trash2,
  ExternalLink, User
} from "lucide-react";

interface Warga {
  id: string;
  nik: string;
  namaLengkap: string;
  statusAktif: string;
  jenisKelamin: string | null;
}

interface KeluargaItem {
  id: string;
  nomorKK: string;
  kepalaKeluarga: string;
  anggota: Warga[];
}

interface Kendaraan {
  id: string;
  pemilik: string;
  jenisKendaraan: string;
  merek: string | null;
  nomorPolisi: string;
  warna: string | null;
}

interface RumahDetail {
  id: string;
  nomorRumah: string;
  blok: string | null;
  alamat: string;
  rt: string | null;
  rw: string | null;
  statusHuni: string;
  statusMilik: string;
  luasTanah: number | null;
  luasBangunan: number | null;
  keluarga: KeluargaItem[];
  kendaraan: Kendaraan[];
}

const STATUS_HUNI: Record<string, string> = {
  DIHUNI: "Dihuni", TIDAK_DIHUNI: "Kosong", DISEWAKAN: "Disewakan",
};
const STATUS_MILIK: Record<string, string> = {
  MILIK_SENDIRI: "Milik Sendiri", SEWA: "Sewa", KONTRAK: "Kontrak", LAINNYA: "Lainnya",
};
const JENIS_KENDARAAN: Record<string, string> = {
  MOTOR: "Motor", MOBIL: "Mobil", SEPEDA: "Sepeda", LAINNYA: "Lainnya",
};
const STATUS_AKTIF_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  AKTIF: "default", PINDAH: "secondary", MENINGGAL: "destructive", TIDAK_AKTIF: "secondary",
};
const STATUS_AKTIF_LABEL: Record<string, string> = {
  AKTIF: "Aktif", PINDAH: "Pindah", MENINGGAL: "Meninggal", TIDAK_AKTIF: "Tidak Aktif",
};

export default function RumahDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [rumah, setRumah] = useState<RumahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});

  const fetchRumah = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/rumah/${id}`);
    const d = await res.json();
    if (d.success) {
      setRumah(d.data);
      setForm({
        nomorRumah: d.data.nomorRumah || "",
        blok: d.data.blok || "",
        alamat: d.data.alamat || "",
        rt: d.data.rt || "",
        rw: d.data.rw || "",
        statusHuni: d.data.statusHuni || "DIHUNI",
        statusMilik: d.data.statusMilik || "MILIK_SENDIRI",
        luasTanah: d.data.luasTanah?.toString() || "",
        luasBangunan: d.data.luasBangunan?.toString() || "",
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchRumah(); }, [fetchRumah]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = { ...form };
    if (body.luasTanah) body.luasTanah = parseFloat(body.luasTanah as string);
    else delete body.luasTanah;
    if (body.luasBangunan) body.luasBangunan = parseFloat(body.luasBangunan as string);
    else delete body.luasBangunan;
    for (const k of ["blok", "rt", "rw"]) {
      if (!body[k]) body[k] = null;
    }

    const res = await fetch(`/api/v1/rumah/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Gagal menyimpan"); return; }
    setSuccess("Data rumah berhasil diperbarui");
    setEditing(false);
    fetchRumah();
  }

  async function handleDelete() {
    if (!confirm("Hapus data rumah ini? Aksi ini tidak dapat dibatalkan.")) return;
    setDeleting(true);
    const res = await fetch(`/api/v1/rumah/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/rumah");
    } else {
      const d = await res.json();
      setError(d.error || "Gagal menghapus");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="h-8 w-48 animate-pulse bg-gray-200 rounded" />
        <div className="h-48 animate-pulse bg-gray-200 rounded" />
        <div className="h-48 animate-pulse bg-gray-200 rounded" />
      </div>
    );
  }

  if (!rumah) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Rumah tidak ditemukan</p>
        <Link href="/rumah"><Button variant="outline" className="mt-4">Kembali</Button></Link>
      </div>
    );
  }

  // Total warga dari semua KK di rumah ini
  const allWarga = rumah.keluarga.flatMap((kk) => kk.anggota);
  const totalWarga = allWarga.length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/rumah">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Home className="h-5 w-5 text-muted-foreground" />
              Rumah No. {rumah.nomorRumah}
              {rumah.blok && <span className="text-muted-foreground font-normal text-lg">Blok {rumah.blok}</span>}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">{rumah.alamat}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                <Trash2 className="h-4 w-4 mr-1" /> {deleting ? "..." : "Hapus"}
              </Button>
            </>
          )}
        </div>
      </div>

      {success && <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">{success}</div>}
      {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{rumah.keluarga.length}</div>
            <div className="text-sm text-muted-foreground">Kartu Keluarga</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{totalWarga}</div>
            <div className="text-sm text-muted-foreground">Warga Aktif</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{rumah.kendaraan.length}</div>
            <div className="text-sm text-muted-foreground">Kendaraan</div>
          </CardContent>
        </Card>
      </div>

      {/* Info Rumah */}
      {!editing ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Informasi Rumah</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">No. Rumah</dt>
                <dd className="font-medium mt-0.5">{rumah.nomorRumah}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Blok</dt>
                <dd className="font-medium mt-0.5">{rumah.blok || "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">RT / RW</dt>
                <dd className="font-medium mt-0.5">{rumah.rt || "-"} / {rumah.rw || "-"}</dd>
              </div>
              <div className="col-span-2 md:col-span-3">
                <dt className="text-muted-foreground">Alamat</dt>
                <dd className="font-medium mt-0.5">{rumah.alamat}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status Huni</dt>
                <dd className="mt-0.5">
                  <Badge variant={rumah.statusHuni === "DIHUNI" ? "success" : "secondary"}>
                    {STATUS_HUNI[rumah.statusHuni]}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status Milik</dt>
                <dd className="font-medium mt-0.5">{STATUS_MILIK[rumah.statusMilik] || rumah.statusMilik}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Luas Tanah</dt>
                <dd className="font-medium mt-0.5">{rumah.luasTanah ? `${rumah.luasTanah} m²` : "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Luas Bangunan</dt>
                <dd className="font-medium mt-0.5">{rumah.luasBangunan ? `${rumah.luasBangunan} m²` : "-"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Edit Informasi Rumah</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">No. Rumah *</label>
                  <Input value={form.nomorRumah} onChange={(e) => setForm(p => ({ ...p, nomorRumah: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Blok</label>
                  <Input value={form.blok} onChange={(e) => setForm(p => ({ ...p, blok: e.target.value }))} placeholder="Opsional" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">RT</label>
                  <Input value={form.rt} onChange={(e) => setForm(p => ({ ...p, rt: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">RW</label>
                  <Input value={form.rw} onChange={(e) => setForm(p => ({ ...p, rw: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Luas Tanah (m²)</label>
                  <Input type="number" value={form.luasTanah} onChange={(e) => setForm(p => ({ ...p, luasTanah: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Luas Bangunan (m²)</label>
                  <Input type="number" value={form.luasBangunan} onChange={(e) => setForm(p => ({ ...p, luasBangunan: e.target.value }))} />
                </div>
                <div className="col-span-2 md:col-span-3 space-y-1">
                  <label className="text-sm font-medium">Alamat *</label>
                  <Input value={form.alamat} onChange={(e) => setForm(p => ({ ...p, alamat: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Status Huni</label>
                  <Select value={form.statusHuni} onChange={(e) => setForm(p => ({ ...p, statusHuni: e.target.value }))}>
                    <option value="DIHUNI">Dihuni</option>
                    <option value="TIDAK_DIHUNI">Kosong</option>
                    <option value="DISEWAKAN">Disewakan</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Status Milik</label>
                  <Select value={form.statusMilik} onChange={(e) => setForm(p => ({ ...p, statusMilik: e.target.value }))}>
                    <option value="MILIK_SENDIRI">Milik Sendiri</option>
                    <option value="SEWA">Sewa</option>
                    <option value="KONTRAK">Kontrak</option>
                    <option value="LAINNYA">Lainnya</option>
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

      {/* Daftar Keluarga & Anggota */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Kartu Keluarga ({rumah.keluarga.length} KK)
            </CardTitle>
            <Link href={`/keluarga`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3 w-3 mr-1" /> Kelola KK
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {rumah.keluarga.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada keluarga terdaftar di rumah ini</p>
          ) : (
            <div className="space-y-4">
              {rumah.keluarga.map((kk) => (
                <div key={kk.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                          KK: {kk.nomorKK}
                        </span>
                      </div>
                      <p className="font-semibold mt-1">
                        Kepala Keluarga: {kk.kepalaKeluarga}
                      </p>
                    </div>
                    <Link href={`/keluarga/${kk.id}`}>
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                        <ExternalLink className="h-3 w-3 mr-1" /> Detail KK
                      </Button>
                    </Link>
                  </div>
                  {kk.anggota.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {kk.anggota.map((w) => (
                        <Link key={w.id} href={`/warga/${w.id}`}>
                          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors cursor-pointer group">
                            <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate group-hover:text-blue-700">{w.namaLengkap}</p>
                              <p className="text-xs text-muted-foreground font-mono">{w.nik}</p>
                            </div>
                            <Badge
                              variant={STATUS_AKTIF_BADGE[w.statusAktif] || "secondary"}
                              className="text-xs flex-shrink-0"
                            >
                              {STATUS_AKTIF_LABEL[w.statusAktif] || w.statusAktif}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Belum ada anggota aktif</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kendaraan */}
      {rumah.kendaraan.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4" /> Kendaraan ({rumah.kendaraan.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rumah.kendaraan.map((k) => (
                <div key={k.id} className="flex items-center gap-3 border rounded-lg p-3">
                  <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Car className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium font-mono">{k.nomorPolisi}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {JENIS_KENDARAAN[k.jenisKendaraan]} {k.merek} {k.warna ? `· ${k.warna}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Pemilik: {k.pemilik}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

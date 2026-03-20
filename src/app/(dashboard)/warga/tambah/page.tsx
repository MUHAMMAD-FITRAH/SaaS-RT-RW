"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function TambahWargaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keluargaList, setKeluargaList] = useState<{ id: string; nomorKK: string; kepalaKeluarga: string }[]>([]);

  const [form, setForm] = useState({
    nik: "",
    namaLengkap: "",
    tempatLahir: "",
    tanggalLahir: "",
    jenisKelamin: "",
    golonganDarah: "",
    agama: "",
    statusPerkawinan: "",
    pekerjaan: "",
    pendidikan: "",
    kewarganegaraan: "WNI",
    nomorHP: "",
    email: "",
    statusTinggal: "TETAP",
    keluargaId: "",
    catatan: "",
  });

  useEffect(() => {
    fetch("/api/v1/keluarga?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setKeluargaList(d.data);
      });
  }, []);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/v1/warga", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        keluargaId: form.keluargaId || undefined,
        jenisKelamin: form.jenisKelamin || undefined,
        agama: form.agama || undefined,
        statusPerkawinan: form.statusPerkawinan || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Gagal menyimpan data");
      return;
    }

    router.push("/warga");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/warga">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Tambah Warga</h1>
          <p className="text-muted-foreground">Isi data warga baru</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Pribadi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">NIK *</label>
                  <Input
                    placeholder="16 digit NIK"
                    value={form.nik}
                    onChange={(e) => updateField("nik", e.target.value)}
                    maxLength={16}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Lengkap *</label>
                  <Input
                    placeholder="Nama lengkap sesuai KTP"
                    value={form.namaLengkap}
                    onChange={(e) => updateField("namaLengkap", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tempat Lahir</label>
                  <Input
                    placeholder="Kota kelahiran"
                    value={form.tempatLahir}
                    onChange={(e) => updateField("tempatLahir", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal Lahir</label>
                  <Input
                    type="date"
                    value={form.tanggalLahir}
                    onChange={(e) => updateField("tanggalLahir", e.target.value)}
                  />
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
                  <Input
                    placeholder="Pekerjaan"
                    value={form.pekerjaan}
                    onChange={(e) => updateField("pekerjaan", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pendidikan</label>
                  <Input
                    placeholder="Pendidikan terakhir"
                    value={form.pendidikan}
                    onChange={(e) => updateField("pendidikan", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kontak & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nomor HP</label>
                  <Input
                    placeholder="08xxxxxxxxxx"
                    value={form.nomorHP}
                    onChange={(e) => updateField("nomorHP", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="email@contoh.com"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
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
                  <label className="text-sm font-medium">Keluarga (KK)</label>
                  <Select value={form.keluargaId} onChange={(e) => updateField("keluargaId", e.target.value)}>
                    <option value="">Belum dipilih</option>
                    {keluargaList.map((kk) => (
                      <option key={kk.id} value={kk.id}>
                        {kk.nomorKK} - {kk.kepalaKeluarga}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Catatan</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Catatan tambahan..."
                  value={form.catatan}
                  onChange={(e) => updateField("catatan", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 mt-6">
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Menyimpan..." : "Simpan Warga"}
          </Button>
          <Link href="/warga">
            <Button type="button" variant="outline">
              Batal
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

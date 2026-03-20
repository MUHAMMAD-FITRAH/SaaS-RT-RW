"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, User } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface WargaDetail {
  id: string;
  nik: string;
  namaLengkap: string;
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
  catatan: string | null;
  createdAt: string;
  keluarga: {
    nomorKK: string;
    kepalaKeluarga: string;
    rumah: { nomorRumah: string; blok: string | null; alamat: string };
  } | null;
}

const LABEL_MAP: Record<string, string> = {
  LAKI_LAKI: "Laki-laki",
  PEREMPUAN: "Perempuan",
  BELUM_KAWIN: "Belum Kawin",
  KAWIN: "Kawin",
  CERAI_HIDUP: "Cerai Hidup",
  CERAI_MATI: "Cerai Mati",
  TETAP: "Tetap",
  KONTRAK: "Kontrak",
  KOST: "Kost",
  AKTIF: "Aktif",
  PINDAH: "Pindah",
  MENINGGAL: "Meninggal",
};

export default function WargaDetailPage() {
  const { id } = useParams();
  const [warga, setWarga] = useState<WargaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/warga/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setWarga(d.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

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
        <Link href="/warga">
          <Button variant="outline" className="mt-4">
            Kembali
          </Button>
        </Link>
      </div>
    );
  }

  const fields = [
    { label: "NIK", value: warga.nik },
    { label: "Nama Lengkap", value: warga.namaLengkap },
    { label: "Tempat Lahir", value: warga.tempatLahir },
    { label: "Tanggal Lahir", value: warga.tanggalLahir ? formatDate(warga.tanggalLahir) : null },
    { label: "Jenis Kelamin", value: warga.jenisKelamin ? LABEL_MAP[warga.jenisKelamin] : null },
    { label: "Agama", value: warga.agama },
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/warga">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{warga.namaLengkap}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={
                  warga.statusAktif === "AKTIF" ? "success" :
                  warga.statusAktif === "PINDAH" ? "warning" : "destructive"
                }
              >
                {LABEL_MAP[warga.statusAktif] || warga.statusAktif}
              </Badge>
              <span className="text-sm text-muted-foreground font-mono">{warga.nik}</span>
            </div>
          </div>
        </div>
        <Link href={`/warga/${warga.id}?edit=true`}>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Data Pribadi
            </CardTitle>
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
              <CardTitle className="text-base">Data Keluarga & Rumah</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">No. KK</dt>
                  <dd className="text-sm font-medium font-mono">{warga.keluarga.nomorKK}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Kepala Keluarga</dt>
                  <dd className="text-sm font-medium">{warga.keluarga.kepalaKeluarga}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">No. Rumah</dt>
                  <dd className="text-sm font-medium">
                    {warga.keluarga.rumah.nomorRumah}
                    {warga.keluarga.rumah.blok ? ` Blok ${warga.keluarga.rumah.blok}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Alamat</dt>
                  <dd className="text-sm font-medium">{warga.keluarga.rumah.alamat}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        {warga.catatan && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Catatan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{warga.catatan}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

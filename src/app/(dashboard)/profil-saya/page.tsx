"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import { User, MapPin, Phone, Mail, Briefcase, Home, Users, FileText, Edit2, Save, X } from "lucide-react";

interface ProfilData {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  lastLoginAt: string | null;
  tenant: {
    name: string;
    rtNumber: string;
    rwNumber: string;
    kelurahan: string;
    kecamatan: string;
    kota: string;
  } | null;
  warga: {
    nik: string;
    namaLengkap: string;
    tempatLahir: string;
    tanggalLahir: string;
    jenisKelamin: string;
    agama: string;
    statusPerkawinan: string;
    pekerjaan: string;
    pendidikan: string;
    nomorHP: string;
    statusTinggal: string;
    statusAktif: string;
    keluarga: {
      nomorKK: string;
      kepalaKeluarga: string;
      rumah: { nomorRumah: string; blok: string; alamat: string } | null;
    } | null;
  } | null;
}

export default function ProfilSayaPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RESIDENT]}>
      <ProfilContent />
    </RoleGuard>
  );
}

function ProfilContent() {
  const { data: session } = useSession();
  const [profil, setProfil] = useState<ProfilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editPhone, setEditPhone] = useState("");

  useEffect(() => {
    fetch("/api/v1/profil-saya")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProfil(data.data);
          setEditPhone(data.data.phone || "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    const res = await fetch("/api/v1/profil-saya", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: editPhone }),
    });
    if (res.ok) {
      setProfil((prev) => prev ? { ...prev, phone: editPhone } : prev);
      setEditing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Data Saya</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-24 animate-pulse bg-gray-200 rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!profil) return <p className="text-red-500">Gagal memuat data profil.</p>;

  const w = profil.warga;
  const t = profil.tenant;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Saya</h1>
          <p className="text-muted-foreground">Informasi pribadi & kependudukan Anda</p>
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit2 className="h-4 w-4 mr-2" /> Edit Kontak
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Simpan</Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Informasi Akun
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Nama" value={profil.name} />
            <InfoRow label="Email" value={profil.email} icon={<Mail className="h-3 w-3" />} />
            <div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> Telepon
              </span>
              {editing ? (
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1" />
              ) : (
                <p className="font-medium">{profil.phone || "-"}</p>
              )}
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Login Terakhir</span>
              <p className="font-medium">{profil.lastLoginAt ? new Date(profil.lastLoginAt).toLocaleString("id-ID") : "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warga Data */}
      {w && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Data Kependudukan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoRow label="NIK" value={w.nik} />
              <InfoRow label="Nama Lengkap" value={w.namaLengkap} />
              <InfoRow label="Tempat, Tgl Lahir" value={`${w.tempatLahir || "-"}, ${w.tanggalLahir ? new Date(w.tanggalLahir).toLocaleDateString("id-ID") : "-"}`} />
              <InfoRow label="Jenis Kelamin" value={w.jenisKelamin === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"} />
              <InfoRow label="Agama" value={w.agama} />
              <InfoRow label="Status Kawin" value={w.statusPerkawinan?.replace(/_/g, " ")} />
              <InfoRow label="Pekerjaan" value={w.pekerjaan} icon={<Briefcase className="h-3 w-3" />} />
              <InfoRow label="Pendidikan" value={w.pendidikan} />
              <InfoRow label="No. HP" value={w.nomorHP} icon={<Phone className="h-3 w-3" />} />
              <div>
                <span className="text-xs text-muted-foreground">Status</span>
                <div className="mt-0.5">
                  <Badge variant={w.statusAktif === "AKTIF" ? "default" : "destructive"}>
                    {w.statusAktif}
                  </Badge>
                </div>
              </div>
              <InfoRow label="Status Tinggal" value={w.statusTinggal} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keluarga & Rumah */}
      {w?.keluarga && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Data Keluarga
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="No. KK" value={w.keluarga.nomorKK} />
              <InfoRow label="Kepala Keluarga" value={w.keluarga.kepalaKeluarga} />
            </CardContent>
          </Card>

          {w.keluarga.rumah && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Home className="h-4 w-4" /> Data Rumah
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="No. Rumah" value={`${w.keluarga.rumah.blok || ""}-${w.keluarga.rumah.nomorRumah}`} />
                <InfoRow label="Alamat" value={w.keluarga.rumah.alamat} icon={<MapPin className="h-3 w-3" />} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tenant Info */}
      {t && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Informasi RT/RW
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="RT/RW" value={`RT ${t.rtNumber} / RW ${t.rwNumber}`} />
              <InfoRow label="Kelurahan" value={t.kelurahan} />
              <InfoRow label="Kecamatan" value={t.kecamatan} />
              <InfoRow label="Kota" value={t.kota} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </span>
      <p className="font-medium">{value || "-"}</p>
    </div>
  );
}

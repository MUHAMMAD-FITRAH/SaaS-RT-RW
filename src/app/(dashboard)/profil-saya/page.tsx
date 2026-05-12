"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import {
  User, MapPin, Phone, Mail, Briefcase, Home, Users,
  FileText, Edit2, Save, X, Camera, CheckCircle2, Clock,
  Baby, Venus, Mars, Shield,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnggotaItem {
  id: string;
  namaLengkap: string;
  nik: string;
  jenisKelamin: string;
  tanggalLahir: string | null;
  statusPerkawinan: string | null;
  pekerjaan: string | null;
  statusAktif: string;
  foto: string | null;
  sudahPunyaAkun: boolean;
}

interface ProfilData {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  keluargaId: string | null;
  lastLoginAt: string | null;
  tenant: {
    id: string;
    name: string;
    rtNumber: string;
    rwNumber: string;
    kelurahan: string | null;
    kecamatan: string | null;
    kota: string | null;
  } | null;
  warga: {
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
    statusTinggal: string | null;
    statusAktif: string;
  } | null;
  keluarga: {
    id: string;
    nomorKK: string;
    kepalaKeluarga: string;
    rumah: {
      id: string;
      nomorRumah: string;
      blok: string | null;
      alamat: string | null;
      rt: string | null;
      rw: string | null;
      statusHuni: string | null;
    } | null;
    anggota: AnggotaItem[];
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatTanggal(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function umur(iso: string | null | undefined) {
  if (!iso) return null;
  const ageDiff = Date.now() - new Date(iso).getTime();
  return Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </span>
      <p className="font-medium text-sm mt-0.5">{value || "-"}</p>
    </div>
  );
}

function GenderIcon({ jk }: { jk: string | null | undefined }) {
  if (jk === "LAKI_LAKI") return <Mars className="h-3 w-3 text-blue-500" />;
  if (jk === "PEREMPUAN") return <Venus className="h-3 w-3 text-pink-500" />;
  return null;
}

function AnggotaCard({ a, isMe }: { a: AnggotaItem; isMe: boolean }) {
  const usia = umur(a.tanggalLahir);
  const bgColor = a.jenisKelamin === "LAKI_LAKI" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700";

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${isMe ? "border-primary/30 bg-primary/5" : "bg-gray-50"}`}>
      {/* Avatar */}
      {a.foto ? (
        <Image src={a.foto} alt={a.namaLengkap} width={44} height={44}
          className="rounded-full object-cover w-11 h-11 shrink-0" />
      ) : (
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${bgColor}`}>
          {getInitials(a.namaLengkap)}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-sm truncate">{a.namaLengkap}</span>
          {isMe && <Badge variant="outline" className="text-[10px] py-0 h-4">Saya</Badge>}
          <GenderIcon jk={a.jenisKelamin} />
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {usia !== null ? `${usia} tahun` : ""}
          {usia !== null && a.pekerjaan ? " · " : ""}
          {a.pekerjaan ?? ""}
        </p>
        <p className="text-xs text-muted-foreground font-mono">{a.nik}</p>
      </div>

      {/* Badges */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge variant={a.statusAktif === "AKTIF" ? "default" : "destructive"} className="text-[10px] py-0 h-4">
          {a.statusAktif}
        </Badge>
        {a.sudahPunyaAkun ? (
          <span className="flex items-center gap-0.5 text-[10px] text-green-600">
            <CheckCircle2 className="h-3 w-3" /> Punya akun
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" /> Belum daftar
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Avatar Uploader ──────────────────────────────────────────────────────────

function AvatarUploader({
  currentAvatar,
  name,
  onUploaded,
}: {
  currentAvatar: string | null;
  name: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentAvatar);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview immediately
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "avatar");

    const res = await fetch("/api/v1/upload", { method: "POST", body: fd });
    const d = await res.json();
    setUploading(false);

    if (res.ok && d.data?.url) {
      onUploaded(d.data.url);
    }
  }

  return (
    <div className="relative group">
      {preview ? (
        <Image src={preview} alt={name} width={96} height={96}
          className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-md" />
      ) : (
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary ring-4 ring-white shadow-md">
          {getInitials(name)}
        </div>
      )}

      {/* Overlay button */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Ganti foto profil"
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilSayaPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RESIDENT]}>
      <ProfilContent />
    </RoleGuard>
  );
}

function ProfilContent() {
  const { data: session, update: updateSession } = useSession();
  const [profil, setProfil] = useState<ProfilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ phone: "", name: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/v1/profil-saya")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProfil(d.data);
          setEditForm({ phone: d.data.phone || "", name: d.data.name || "" });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/v1/profil-saya", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: editForm.phone, name: editForm.name }),
    });
    if (res.ok) {
      setProfil((prev) => prev ? { ...prev, phone: editForm.phone, name: editForm.name } : prev);
      await updateSession();
      setEditing(false);
    }
    setSaving(false);
  }

  function handleAvatarUploaded(url: string) {
    setProfil((prev) => prev ? { ...prev, avatar: url } : prev);
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-32 animate-pulse bg-gray-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!profil) return <p className="text-red-500">Gagal memuat data profil.</p>;

  const w = profil.warga;
  const t = profil.tenant;
  const kk = profil.keluarga;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold">Data Saya</h1>
        <p className="text-muted-foreground text-sm">Informasi pribadi & kependudukan Anda</p>
      </div>

      {/* ── Profile Hero Card ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <AvatarUploader
              currentAvatar={profil.avatar}
              name={profil.name}
              onUploaded={handleAvatarUploaded}
            />

            <div className="flex-1 text-center sm:text-left">
              {editing ? (
                <Input
                  className="text-lg font-semibold mb-1 h-8"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                />
              ) : (
                <h2 className="text-xl font-bold">{profil.name}</h2>
              )}
              <p className="text-sm text-muted-foreground">{profil.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap justify-center sm:justify-start">
                <Badge variant="secondary" className="capitalize">
                  <Shield className="h-3 w-3 mr-1" />
                  {profil.role === "RESIDENT" ? "Warga" : profil.role}
                </Badge>
                {t && (
                  <Badge variant="outline">
                    <MapPin className="h-3 w-3 mr-1" />
                    RT {t.rtNumber} / RW {t.rwNumber}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Login terakhir: {profil.lastLoginAt ? new Date(profil.lastLoginAt).toLocaleString("id-ID") : "-"}
              </p>
            </div>

            {/* Edit actions */}
            <div className="flex gap-2 shrink-0">
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" /> Edit
                </Button>
              ) : (
                <>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Menyimpan..." : "Simpan"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Contact row */}
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {editing ? (
                <Input
                  className="h-7 w-40 text-sm"
                  placeholder="Nomor telepon"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                />
              ) : (
                <span>{profil.phone || <span className="text-muted-foreground italic">Belum diisi</span>}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{profil.email}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Data Kependudukan ── */}
      {w && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Data Kependudukan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoRow label="NIK" value={w.nik} />
              <InfoRow label="Nama Lengkap" value={w.namaLengkap} />
              <InfoRow
                label="Tempat, Tgl Lahir"
                value={`${w.tempatLahir || "-"}, ${formatTanggal(w.tanggalLahir)}`}
              />
              <InfoRow
                label="Jenis Kelamin"
                value={w.jenisKelamin === "LAKI_LAKI" ? "Laki-laki" : w.jenisKelamin === "PEREMPUAN" ? "Perempuan" : "-"}
              />
              <InfoRow label="Gol. Darah" value={w.golonganDarah} />
              <InfoRow label="Agama" value={w.agama} />
              <InfoRow label="Status Kawin" value={w.statusPerkawinan?.replace(/_/g, " ")} />
              <InfoRow label="Pekerjaan" value={w.pekerjaan} icon={<Briefcase className="h-3 w-3" />} />
              <InfoRow label="Pendidikan" value={w.pendidikan} />
              <InfoRow label="Kewarganegaraan" value={w.kewarganegaraan} />
              <InfoRow label="No. HP Warga" value={w.nomorHP} icon={<Phone className="h-3 w-3" />} />
              <InfoRow label="Status Tinggal" value={w.statusTinggal} />
              <div>
                <span className="text-xs text-muted-foreground">Status</span>
                <div className="mt-1">
                  <Badge variant={w.statusAktif === "AKTIF" ? "default" : "destructive"}>
                    {w.statusAktif}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Kartu Keluarga & Anggota ── */}
      {kk && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Kartu Keluarga
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* KK meta */}
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="No. Kartu Keluarga" value={kk.nomorKK} />
              <InfoRow label="Kepala Keluarga" value={kk.kepalaKeluarga} />
            </div>

            {/* Anggota list */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Baby className="h-3 w-3" /> Anggota Keluarga ({kk.anggota.length})
              </p>
              <div className="space-y-2">
                {kk.anggota.map((a) => (
                  <AnggotaCard
                    key={a.id}
                    a={a}
                    isMe={a.nik === w?.nik}
                  />
                ))}
                {kk.anggota.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Belum ada anggota keluarga tercatat.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Data Rumah ── */}
      {kk?.rumah && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4" /> Data Rumah
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoRow
                label="No. Rumah"
                value={kk.rumah.blok ? `Blok ${kk.rumah.blok}-${kk.rumah.nomorRumah}` : kk.rumah.nomorRumah}
              />
              <InfoRow label="RT / RW" value={kk.rumah.rt && kk.rumah.rw ? `RT ${kk.rumah.rt} / RW ${kk.rumah.rw}` : null} />
              <InfoRow label="Status Huni" value={kk.rumah.statusHuni} />
              <div className="col-span-2 sm:col-span-3">
                <InfoRow label="Alamat" value={kk.rumah.alamat} icon={<MapPin className="h-3 w-3" />} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Info RT ── */}
      {t && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Informasi RT/RW
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoRow label="Nama RT" value={t.name} />
              <InfoRow label="RT / RW" value={`RT ${t.rtNumber} / RW ${t.rwNumber}`} />
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

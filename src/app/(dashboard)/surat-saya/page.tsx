"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import { FileText, Plus, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface SuratItem {
  id: string;
  nomorSurat: string;
  jenisSurat: string;
  perihal: string;
  status: string;
  tanggalSurat: string;
  tanggalDisetujui: string | null;
  catatan: string | null;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  DIAJUKAN: { label: "Diajukan", variant: "outline", icon: Clock },
  DIPROSES: { label: "Diproses", variant: "secondary", icon: Loader2 },
  DISETUJUI: { label: "Disetujui", variant: "default", icon: CheckCircle },
  DITOLAK: { label: "Ditolak", variant: "destructive", icon: XCircle },
};

const JENIS_SURAT = [
  "SURAT_PENGANTAR", "SURAT_KETERANGAN", "SURAT_DOMISILI", "SURAT_TIDAK_MAMPU",
  "SURAT_KEMATIAN", "SURAT_KELAHIRAN", "SURAT_PINDAH", "SURAT_USAHA", "LAINNYA",
];

export default function SuratSayaPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RESIDENT]}>
      <SuratContent />
    </RoleGuard>
  );
}

function SuratContent() {
  const [suratList, setSuratList] = useState<SuratItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [jenisSurat, setJenisSurat] = useState("");
  const [perihal, setPerihal] = useState("");
  const [isiSurat, setIsiSurat] = useState("");

  function loadSurat() {
    fetch("/api/v1/surat-saya")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSuratList(data.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSurat(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/v1/surat-saya", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jenisSurat, perihal, isiSurat }),
    });
    if (res.ok) {
      setShowForm(false);
      setJenisSurat("");
      setPerihal("");
      setIsiSurat("");
      loadSurat();
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Surat Saya</h1>
          <p className="text-muted-foreground">Ajukan & pantau status surat Anda</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Ajukan Surat
        </Button>
      </div>

      {/* Form Pengajuan */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Form Pengajuan Surat Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jenis Surat</label>
                  <Select value={jenisSurat} onChange={(e) => setJenisSurat(e.target.value)}>
                    <option value="">Pilih jenis surat</option>
                    {JENIS_SURAT.map((j) => (
                      <option key={j} value={j}>
                        {j.replace(/_/g, " ").replace(/SURAT /g, "")}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Perihal</label>
                  <Input value={perihal} onChange={(e) => setPerihal(e.target.value)} placeholder="Perihal surat" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Keterangan Tambahan</label>
                <textarea
                  value={isiSurat}
                  onChange={(e) => setIsiSurat(e.target.value)}
                  placeholder="Tuliskan keterangan tambahan jika ada..."
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting || !jenisSurat || !perihal}>
                  {submitting ? "Mengirim..." : "Kirim Pengajuan"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Daftar Surat */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-16 animate-pulse bg-gray-200 rounded" /></CardContent></Card>
          ))}
        </div>
      ) : suratList.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">Belum ada surat</p>
            <p className="text-sm text-muted-foreground mt-1">Klik tombol &quot;Ajukan Surat&quot; untuk membuat pengajuan baru</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suratList.map((surat) => {
            const statusInfo = STATUS_MAP[surat.status];
            const StatusIcon = statusInfo?.icon || Clock;
            return (
              <Card key={surat.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{surat.perihal}</span>
                        <Badge variant={statusInfo?.variant || "outline"} className="text-xs">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo?.label || surat.status}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>No: {surat.nomorSurat}</span>
                        <span>Jenis: {surat.jenisSurat.replace(/_/g, " ")}</span>
                        <span>Tanggal: {new Date(surat.tanggalSurat).toLocaleDateString("id-ID")}</span>
                      </div>
                      {surat.catatan && (
                        <p className="text-xs text-muted-foreground mt-2 bg-gray-50 p-2 rounded">
                          Catatan: {surat.catatan}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

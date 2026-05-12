"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import {
  FileText, Plus, Clock, CheckCircle, XCircle,
  Loader2, Printer, Info,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SuratItem {
  id: string;
  nomorSurat: string;
  jenisSurat: string;
  perihal: string;
  status: string;
  tanggalSurat: string;
  tanggalDisetujui: string | null;
  disetujuiOleh: string | null;
  catatan: string | null;
}

const STATUS_MAP: Record<string, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: typeof Clock;
  desc: string;
}> = {
  DIAJUKAN:  { label: "Diajukan",  variant: "outline",     icon: Clock,        desc: "Pengajuan Anda diterima, menunggu diproses" },
  DIPROSES:  { label: "Diproses",  variant: "secondary",   icon: Loader2,      desc: "Surat sedang diproses oleh pengurus RT" },
  DISETUJUI: { label: "Disetujui", variant: "default",     icon: CheckCircle,  desc: "Surat telah disetujui dan siap dicetak" },
  DITOLAK:   { label: "Ditolak",   variant: "destructive", icon: XCircle,      desc: "Pengajuan ditolak. Lihat catatan untuk alasan" },
};

const JENIS_SURAT = [
  { val: "SURAT_PENGANTAR",   label: "Surat Pengantar" },
  { val: "SURAT_KETERANGAN",  label: "Surat Keterangan" },
  { val: "SURAT_DOMISILI",    label: "Surat Domisili" },
  { val: "SURAT_TIDAK_MAMPU", label: "Surat Tidak Mampu" },
  { val: "SURAT_KEMATIAN",    label: "Surat Keterangan Kematian" },
  { val: "SURAT_KELAHIRAN",   label: "Surat Keterangan Kelahiran" },
  { val: "SURAT_PINDAH",      label: "Surat Keterangan Pindah" },
  { val: "SURAT_USAHA",       label: "Surat Keterangan Usaha" },
  { val: "LAINNYA",           label: "Lainnya" },
];

// ─── Page guard ────────────────────────────────────────────────────────────────

export default function SuratSayaPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RESIDENT]}>
      <SuratContent />
    </RoleGuard>
  );
}

// ─── Main content ──────────────────────────────────────────────────────────────

function SuratContent() {
  const [suratList, setSuratList] = useState<SuratItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [jenisSurat, setJenisSurat] = useState("");
  const [perihal, setPerihal]       = useState("");
  const [isiSurat, setIsiSurat]     = useState("");

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
    if (!jenisSurat || !perihal) return;
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

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

  // Count DISETUJUI for the hint banner
  const approvedCount = suratList.filter((s) => s.status === "DISETUJUI").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Surat Saya</h1>
          <p className="text-muted-foreground text-sm">Ajukan &amp; pantau status surat Anda</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Ajukan Surat
        </Button>
      </div>

      {/* Hint for approved surat */}
      {approvedCount > 0 && !showForm && (
        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
          <Info className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          <p className="text-green-800">
            Anda memiliki <strong>{approvedCount} surat disetujui</strong>. Klik tombol{" "}
            <strong>Cetak PDF</strong> untuk mengunduh atau mencetak surat resmi Anda.
          </p>
        </div>
      )}

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
                  <label className="text-sm font-medium">Jenis Surat *</label>
                  <Select value={jenisSurat} onChange={(e) => setJenisSurat(e.target.value)}>
                    <option value="">Pilih jenis surat</option>
                    {JENIS_SURAT.map((j) => (
                      <option key={j.val} value={j.val}>{j.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Perihal *</label>
                  <Input
                    value={perihal}
                    onChange={(e) => setPerihal(e.target.value)}
                    placeholder="Misal: keperluan SKCK, pembuatan KTP, dll."
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Keterangan Tambahan</label>
                <textarea
                  value={isiSurat}
                  onChange={(e) => setIsiSurat(e.target.value)}
                  placeholder="Informasi tambahan yang perlu diketahui pengurus RT (opsional)..."
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
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
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 animate-pulse bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : suratList.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">Belum ada surat</p>
            <p className="text-sm text-muted-foreground mt-1">
              Klik tombol &quot;Ajukan Surat&quot; untuk membuat pengajuan baru
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suratList.map((surat) => {
            const statusInfo = STATUS_MAP[surat.status] ?? STATUS_MAP.DIAJUKAN;
            const StatusIcon = statusInfo.icon;
            const isApproved = surat.status === "DISETUJUI";

            return (
              <Card
                key={surat.id}
                className={isApproved ? "border-green-200 bg-green-50/30" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Info */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{surat.perihal}</span>
                        <Badge variant={statusInfo.variant} className="text-xs">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span>
                          {JENIS_SURAT.find((j) => j.val === surat.jenisSurat)?.label ?? surat.jenisSurat}
                        </span>
                        <span>Diajukan: {formatDate(surat.tanggalSurat)}</span>
                        {surat.tanggalDisetujui && (
                          <span className="text-green-700">
                            Disetujui: {formatDate(surat.tanggalDisetujui)}
                            {surat.disetujuiOleh && ` · ${surat.disetujuiOleh}`}
                          </span>
                        )}
                      </div>

                      {/* Nomor surat — only show when approved */}
                      {isApproved && surat.nomorSurat && (
                        <p className="text-xs font-mono text-green-700 bg-green-100 px-2 py-0.5 rounded w-fit">
                          No: {surat.nomorSurat}
                        </p>
                      )}

                      {/* Status description */}
                      <p className="text-xs text-muted-foreground italic">{statusInfo.desc}</p>

                      {/* Catatan rejection reason */}
                      {surat.catatan && (
                        <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                          Catatan pengurus: {surat.catatan}
                        </p>
                      )}
                    </div>

                    {/* Cetak button — only for DISETUJUI */}
                    {isApproved && (
                      <div className="shrink-0">
                        <Link href={`/surat/${surat.id}/cetak`} target="_blank">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Printer className="h-3.5 w-3.5 mr-1.5" />
                            Cetak PDF
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Legend / help */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Keterangan Status</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(STATUS_MAP).map(([key, val]) => (
              <div key={key} className="flex items-start gap-1.5">
                <Badge variant={val.variant} className="text-[10px] shrink-0 mt-0.5">{val.label}</Badge>
                <p className="text-[11px] text-muted-foreground leading-tight">{val.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

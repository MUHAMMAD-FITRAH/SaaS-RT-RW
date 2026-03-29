"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";
import { FileText, CheckCircle, XCircle, Clock, Search, Loader2 } from "lucide-react";

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
  warga: { namaLengkap: string; nik: string } | null;
}

const STATUS_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "DIAJUKAN", label: "Diajukan" },
  { value: "DIPROSES", label: "Diproses" },
  { value: "DISETUJUI", label: "Disetujui" },
  { value: "DITOLAK", label: "Ditolak" },
];

export default function LaporanSuratPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RW_ADMIN, UserRole.SUPER_ADMIN]}>
      <PersetujuanSuratContent />
    </RoleGuard>
  );
}

function PersetujuanSuratContent() {
  const [suratList, setSuratList] = useState<SuratItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    params.set("limit", "50");

    fetch(`/api/v1/laporan/surat?${params}`)
      .then((res) => res.json())
      .then((data) => { if (data.success) setSuratList(data.data); })
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAction(id: string, status: string) {
    setActionLoading(id);
    await fetch(`/api/v1/laporan/surat/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setActionLoading(null);
    loadData();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Persetujuan Surat</h1>
        <p className="text-muted-foreground">Tinjau & setujui pengajuan surat dari warga</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari perihal atau nomor surat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Surat List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-20 animate-pulse bg-gray-200 rounded" /></CardContent></Card>
          ))}
        </div>
      ) : suratList.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">Tidak ada surat</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suratList.map((surat) => (
            <Card key={surat.id} className={surat.status === "DIAJUKAN" ? "border-amber-200" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{surat.perihal}</span>
                      <Badge variant={
                        surat.status === "DISETUJUI" ? "default" :
                        surat.status === "DITOLAK" ? "destructive" :
                        surat.status === "DIPROSES" ? "secondary" : "outline"
                      } className="text-xs">
                        {surat.status === "DISETUJUI" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {surat.status === "DITOLAK" && <XCircle className="h-3 w-3 mr-1" />}
                        {surat.status === "DIAJUKAN" && <Clock className="h-3 w-3 mr-1" />}
                        {surat.status === "DIPROSES" && <Loader2 className="h-3 w-3 mr-1" />}
                        {surat.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>No: {surat.nomorSurat}</span>
                      <span>Jenis: {surat.jenisSurat.replace(/_/g, " ")}</span>
                      <span>Pemohon: {surat.warga?.namaLengkap || "-"}</span>
                      <span>NIK: {surat.warga?.nik || "-"}</span>
                      <span>Tanggal: {new Date(surat.tanggalSurat).toLocaleDateString("id-ID")}</span>
                    </div>
                    {surat.disetujuiOleh && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Disetujui oleh: {surat.disetujuiOleh} pada {surat.tanggalDisetujui ? new Date(surat.tanggalDisetujui).toLocaleDateString("id-ID") : "-"}
                      </p>
                    )}
                  </div>

                  {/* Action buttons for pending surat */}
                  {(surat.status === "DIAJUKAN" || surat.status === "DIPROSES") && (
                    <div className="flex gap-2 flex-shrink-0">
                      {surat.status === "DIAJUKAN" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAction(surat.id, "DIPROSES")}
                          disabled={actionLoading === surat.id}
                        >
                          Proses
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleAction(surat.id, "DISETUJUI")}
                        disabled={actionLoading === surat.id}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(surat.id, "DITOLAK")}
                        disabled={actionLoading === surat.id}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Tolak
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

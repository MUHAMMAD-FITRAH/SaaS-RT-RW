"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Building2, Plus, MapPin, X } from "lucide-react";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";

type PembangunanStatus = "DIUSULKAN" | "DISETUJUI" | "DALAM_PROSES" | "SELESAI" | "DITOLAK";

interface Pembangunan {
  id: string;
  judul: string;
  deskripsi: string | null;
  pengusul: string;
  estimasiBiaya: number;
  lokasi: string;
  status: PembangunanStatus;
  catatan: string | null;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);

const STATUS_OPTIONS: { value: PembangunanStatus | ""; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "DIUSULKAN", label: "Diusulkan" },
  { value: "DISETUJUI", label: "Disetujui" },
  { value: "DALAM_PROSES", label: "Dalam Proses" },
  { value: "SELESAI", label: "Selesai" },
  { value: "DITOLAK", label: "Ditolak" },
];

function getStatusBadgeVariant(status: PembangunanStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "DIUSULKAN":
      return "outline";
    case "DISETUJUI":
      return "default";
    case "DALAM_PROSES":
      return "secondary";
    case "SELESAI":
      return "default";
    case "DITOLAK":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusLabel(status: PembangunanStatus): string {
  switch (status) {
    case "DIUSULKAN":
      return "Diusulkan";
    case "DISETUJUI":
      return "Disetujui";
    case "DALAM_PROSES":
      return "Dalam Proses";
    case "SELESAI":
      return "Selesai";
    case "DITOLAK":
      return "Ditolak";
    default:
      return status;
  }
}

export default function PembangunanPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RT_ADMIN, UserRole.RW_ADMIN]}>
      <PembangunanContent />
    </RoleGuard>
  );
}

function PembangunanContent() {
  const [proposals, setProposals] = useState<Pembangunan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    judul: "",
    deskripsi: "",
    pengusul: "",
    estimasiBiaya: "",
    lokasi: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      ...(filterStatus && { status: filterStatus }),
    });
    try {
      const res = await fetch(`/api/v1/pembangunan?${params}`);
      const data = await res.json();
      if (data.success) {
        setProposals(data.data);
      }
    } catch {
      // handle error silently
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/pembangunan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimasiBiaya: parseFloat(form.estimasiBiaya),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ judul: "", deskripsi: "", pengusul: "", estimasiBiaya: "", lokasi: "" });
        setShowForm(false);
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/v1/pembangunan/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch {
      // handle error silently
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pembangunan</h1>
          <p className="text-muted-foreground">Kelola usulan dan proyek pembangunan</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Batal" : "Tambah Usulan"}
        </Button>
      </div>

      {/* Status Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={filterStatus === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Usulan Pembangunan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Judul</label>
                <Input
                  placeholder="Judul usulan pembangunan"
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Pengusul</label>
                <Input
                  placeholder="Nama pengusul"
                  value={form.pengusul}
                  onChange={(e) => setForm({ ...form, pengusul: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Estimasi Biaya (Rp)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.estimasiBiaya}
                  onChange={(e) => setForm({ ...form, estimasiBiaya: e.target.value })}
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Lokasi</label>
                <Input
                  placeholder="Lokasi pembangunan"
                  value={form.lokasi}
                  onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1 block">Deskripsi</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Deskripsi detail usulan pembangunan"
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Menyimpan..." : "Simpan Usulan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Proposal Cards */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg mb-2">Belum ada usulan pembangunan</p>
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Tambah Usulan Pertama
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{p.judul}</h3>
                      <Badge variant={getStatusBadgeVariant(p.status)}>
                        {getStatusLabel(p.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Diusulkan oleh <span className="font-medium">{p.pengusul}</span>
                    </p>
                    {p.deskripsi && (
                      <p className="text-sm text-muted-foreground mb-3">{p.deskripsi}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="font-medium text-primary">
                        {formatCurrency(p.estimasiBiaya)}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" /> {p.lokasi}
                      </span>
                    </div>
                    {p.catatan && (
                      <p className="text-sm mt-2 p-2 bg-gray-50 rounded text-muted-foreground">
                        Catatan: {p.catatan}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <Select
                      value={p.status}
                      onChange={(e) => handleStatusChange(p.id, e.target.value)}
                      className="w-40"
                    >
                      <option value="DIUSULKAN">Diusulkan</option>
                      <option value="DISETUJUI">Disetujui</option>
                      <option value="DALAM_PROSES">Dalam Proses</option>
                      <option value="SELESAI">Selesai</option>
                      <option value="DITOLAK">Ditolak</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
} from "lucide-react";

interface Bansos {
  id: string;
  nama: string;
  sumber: string;
  deskripsi: string | null;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  status: string;
  _count: { recipients: number };
}

export default function BansosPage() {
  const [items, setItems] = useState<Bansos[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    sumber: "",
    deskripsi: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    status: "AKTIF",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "10",
      ...(search && { search }),
      ...(filterStatus && { status: filterStatus }),
    });
    const res = await fetch(`/api/v1/bansos?${params}`);
    const data = await res.json();
    if (data.success) {
      setItems(data.data);
      setMeta(data.meta);
    }
    setLoading(false);
  }, [page, search, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchData();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/bansos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ nama: "", sumber: "", deskripsi: "", tanggalMulai: "", tanggalSelesai: "", status: "AKTIF" });
        setShowForm(false);
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const statusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
      AKTIF: "success",
      SELESAI: "secondary",
      DIBATALKAN: "destructive",
    };
    const labels: Record<string, string> = {
      AKTIF: "Aktif",
      SELESAI: "Selesai",
      DIBATALKAN: "Dibatalkan",
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bantuan Sosial</h1>
          <p className="text-muted-foreground">Kelola program bantuan sosial warga</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Tutup" : "Tambah Program"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Program Bansos</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nama Program *</label>
                  <Input
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    placeholder="Nama program bansos"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Sumber Dana *</label>
                  <Input
                    value={form.sumber}
                    onChange={(e) => setForm({ ...form, sumber: e.target.value })}
                    placeholder="Sumber dana"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tanggal Mulai *</label>
                  <Input
                    type="date"
                    value={form.tanggalMulai}
                    onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tanggal Selesai</label>
                  <Input
                    type="date"
                    value={form.tanggalSelesai}
                    onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="AKTIF">Aktif</option>
                    <option value="SELESAI">Selesai</option>
                    <option value="DIBATALKAN">Dibatalkan</option>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Deskripsi</label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  placeholder="Deskripsi program"
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan Program"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="text-base">Daftar Program Bansos ({meta.total})</CardTitle>
            <div className="flex gap-2">
              <Select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="w-36"
              >
                <option value="">Semua Status</option>
                <option value="AKTIF">Aktif</option>
                <option value="SELESAI">Selesai</option>
                <option value="DIBATALKAN">Dibatalkan</option>
              </Select>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Cari program..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64"
                />
                <Button type="submit" variant="secondary" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse bg-gray-100 rounded" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">Belum ada program bansos</p>
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Tambah Program Pertama
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{item.nama}</h3>
                          {statusBadge(item.status)}
                        </div>
                        {item.deskripsi && (
                          <p className="text-sm text-muted-foreground">{item.deskripsi}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>Sumber: {item.sumber}</span>
                          <span>Mulai: {formatDate(item.tanggalMulai)}</span>
                          {item.tanggalSelesai && <span>Selesai: {formatDate(item.tanggalSelesai)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground ml-4">
                        <Users className="h-4 w-4" />
                        <span>{item._count.recipients} penerima</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Halaman {page} dari {meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

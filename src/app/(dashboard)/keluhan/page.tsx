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
  MessageSquare,
  X,
} from "lucide-react";

interface Keluhan {
  id: string;
  pengirim: string;
  email: string | null;
  kategori: string;
  judul: string;
  isi: string;
  status: string;
  tanggapan: string | null;
  tanggalTanggap: string | null;
  createdAt: string;
}

export default function KeluhanPage() {
  const [items, setItems] = useState<Keluhan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [tanggapanText, setTanggapanText] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [form, setForm] = useState({
    pengirim: "",
    email: "",
    kategori: "",
    judul: "",
    isi: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "10",
      ...(search && { search }),
      ...(filterStatus && { status: filterStatus }),
    });
    const res = await fetch(`/api/v1/keluhan?${params}`);
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
      const res = await fetch("/api/v1/keluhan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ pengirim: "", email: "", kategori: "", judul: "", isi: "" });
        setShowForm(false);
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateStatus(id: string, status: string, tanggapan?: string) {
    try {
      const res = await fetch(`/api/v1/keluhan/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          tanggapan: tanggapan || undefined,
          tanggalTanggap: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRespondingId(null);
        setTanggapanText("");
        setNewStatus("");
        fetchData();
      }
    } catch {
      // handle silently
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
    const variants: Record<string, "warning" | "default" | "success" | "destructive"> = {
      BARU: "warning",
      DIPROSES: "default",
      SELESAI: "success",
      DITOLAK: "destructive",
    };
    const labels: Record<string, string> = {
      BARU: "Baru",
      DIPROSES: "Diproses",
      SELESAI: "Selesai",
      DITOLAK: "Ditolak",
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Keluhan Warga</h1>
          <p className="text-muted-foreground">Kelola keluhan dan aspirasi warga</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Tutup" : "Tambah Keluhan"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Keluhan Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nama Pengirim *</label>
                  <Input
                    value={form.pengirim}
                    onChange={(e) => setForm({ ...form, pengirim: e.target.value })}
                    placeholder="Nama pengirim"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Email pengirim"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Kategori *</label>
                  <Input
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    placeholder="Contoh: Infrastruktur, Keamanan, Kebersihan"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Judul *</label>
                  <Input
                    value={form.judul}
                    onChange={(e) => setForm({ ...form, judul: e.target.value })}
                    placeholder="Judul keluhan"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Isi Keluhan *</label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[120px]"
                  value={form.isi}
                  onChange={(e) => setForm({ ...form, isi: e.target.value })}
                  placeholder="Jelaskan keluhan secara detail"
                  required
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Mengirim..." : "Kirim Keluhan"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="text-base">Daftar Keluhan ({meta.total})</CardTitle>
            <div className="flex gap-2">
              <Select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="w-36"
              >
                <option value="">Semua Status</option>
                <option value="BARU">Baru</option>
                <option value="DIPROSES">Diproses</option>
                <option value="SELESAI">Selesai</option>
                <option value="DITOLAK">Ditolak</option>
              </Select>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Cari keluhan..."
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
                <div key={i} className="h-24 animate-pulse bg-gray-100 rounded" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Belum ada keluhan</p>
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Tambah Keluhan Pertama
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{item.judul}</h3>
                          {statusBadge(item.status)}
                          <Badge variant="outline">{item.kategori}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.isi}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Pengirim: {item.pengirim}</span>
                          {item.email && <span>Email: {item.email}</span>}
                          <span>Tanggal: {formatDate(item.createdAt)}</span>
                        </div>
                        {item.tanggapan && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                            <span className="font-medium text-blue-800">Tanggapan:</span>{" "}
                            <span className="text-blue-700">{item.tanggapan}</span>
                            {item.tanggalTanggap && (
                              <span className="text-xs text-blue-500 ml-2">
                                ({formatDate(item.tanggalTanggap)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {respondingId === item.id ? (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        <div className="flex gap-2">
                          <Select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="w-36"
                          >
                            <option value="">Ubah Status</option>
                            <option value="DIPROSES">Diproses</option>
                            <option value="SELESAI">Selesai</option>
                            <option value="DITOLAK">Ditolak</option>
                          </Select>
                        </div>
                        <textarea
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[60px]"
                          value={tanggapanText}
                          onChange={(e) => setTanggapanText(e.target.value)}
                          placeholder="Tulis tanggapan..."
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={!newStatus}
                            onClick={() => handleUpdateStatus(item.id, newStatus, tanggapanText)}
                          >
                            Simpan
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setRespondingId(null); setTanggapanText(""); setNewStatus(""); }}
                          >
                            Batal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        {item.status !== "SELESAI" && item.status !== "DITOLAK" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setRespondingId(item.id); setNewStatus(""); setTanggapanText(item.tanggapan || ""); }}
                          >
                            Tanggapi
                          </Button>
                        )}
                        {item.status === "BARU" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleUpdateStatus(item.id, "DIPROSES")}
                          >
                            Proses
                          </Button>
                        )}
                      </div>
                    )}
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

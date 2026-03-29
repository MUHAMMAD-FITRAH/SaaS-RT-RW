"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  X,
} from "lucide-react";

interface Agenda {
  id: string;
  judul: string;
  deskripsi: string | null;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  lokasi: string | null;
  foto: string[];
  isPublished: boolean;
}

export default function AgendaPage() {
  const [items, setItems] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    judul: "",
    deskripsi: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    lokasi: "",
    isPublished: false,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "10",
      ...(search && { search }),
    });
    const res = await fetch(`/api/v1/agenda?${params}`);
    const data = await res.json();
    if (data.success) {
      setItems(data.data);
      setMeta(data.meta);
    }
    setLoading(false);
  }, [page, search]);

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
      const res = await fetch("/api/v1/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ judul: "", deskripsi: "", tanggalMulai: "", tanggalSelesai: "", lokasi: "", isPublished: false });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-muted-foreground">Kelola agenda kegiatan RT/RW</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Tutup" : "Tambah Agenda"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Agenda Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Judul *</label>
                  <Input
                    value={form.judul}
                    onChange={(e) => setForm({ ...form, judul: e.target.value })}
                    placeholder="Judul agenda"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Lokasi</label>
                  <Input
                    value={form.lokasi}
                    onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
                    placeholder="Lokasi kegiatan"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tanggal Mulai *</label>
                  <Input
                    type="datetime-local"
                    value={form.tanggalMulai}
                    onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tanggal Selesai</label>
                  <Input
                    type="datetime-local"
                    value={form.tanggalSelesai}
                    onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Deskripsi</label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  placeholder="Deskripsi kegiatan"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                />
                <label htmlFor="isPublished" className="text-sm">Publikasikan</label>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan Agenda"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="text-base">Daftar Agenda ({meta.total})</CardTitle>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Cari agenda..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Button type="submit" variant="secondary" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>
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
              <p className="text-lg mb-2">Belum ada agenda</p>
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Tambah Agenda Pertama
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{item.judul}</h3>
                          <Badge variant={item.isPublished ? "success" : "secondary"}>
                            {item.isPublished ? "Dipublikasi" : "Draft"}
                          </Badge>
                        </div>
                        {item.deskripsi && (
                          <p className="text-sm text-muted-foreground">{item.deskripsi}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(item.tanggalMulai)}
                            {item.tanggalSelesai && ` - ${formatDate(item.tanggalSelesai)}`}
                          </span>
                          {item.lokasi && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {item.lokasi}
                            </span>
                          )}
                        </div>
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

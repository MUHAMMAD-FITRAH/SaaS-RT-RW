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
  Newspaper,
  X,
} from "lucide-react";

interface Berita {
  id: string;
  judul: string;
  slug: string;
  konten: string;
  ringkasan: string | null;
  gambar: string | null;
  penulis: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export default function BeritaPage() {
  const [items, setItems] = useState<Berita[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPublished, setFilterPublished] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    judul: "",
    konten: "",
    ringkasan: "",
    penulis: "",
    isPublished: false,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "10",
      ...(search && { search }),
      ...(filterPublished && { isPublished: filterPublished }),
    });
    const res = await fetch(`/api/v1/berita?${params}`);
    const data = await res.json();
    if (data.success) {
      setItems(data.data);
      setMeta(data.meta);
    }
    setLoading(false);
  }, [page, search, filterPublished]);

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
      const res = await fetch("/api/v1/berita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ judul: "", konten: "", ringkasan: "", penulis: "", isPublished: false });
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
          <h1 className="text-2xl font-bold">Berita</h1>
          <p className="text-muted-foreground">Kelola berita dan informasi warga</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Tutup" : "Tambah Berita"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Berita Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Judul *</label>
                  <Input
                    value={form.judul}
                    onChange={(e) => setForm({ ...form, judul: e.target.value })}
                    placeholder="Judul berita"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Penulis *</label>
                  <Input
                    value={form.penulis}
                    onChange={(e) => setForm({ ...form, penulis: e.target.value })}
                    placeholder="Nama penulis"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Ringkasan</label>
                <Input
                  value={form.ringkasan}
                  onChange={(e) => setForm({ ...form, ringkasan: e.target.value })}
                  placeholder="Ringkasan singkat berita"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Konten *</label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[160px]"
                  value={form.konten}
                  onChange={(e) => setForm({ ...form, konten: e.target.value })}
                  placeholder="Isi berita"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublishedBerita"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                />
                <label htmlFor="isPublishedBerita" className="text-sm">Publikasikan sekarang</label>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan Berita"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="text-base">Daftar Berita ({meta.total})</CardTitle>
            <div className="flex gap-2">
              <Select
                value={filterPublished}
                onChange={(e) => { setFilterPublished(e.target.value); setPage(1); }}
                className="w-40"
              >
                <option value="">Semua Status</option>
                <option value="true">Dipublikasi</option>
                <option value="false">Draft</option>
              </Select>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Cari berita..."
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
              <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Belum ada berita</p>
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Tambah Berita Pertama
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
                          <h3 className="font-semibold">{item.judul}</h3>
                          <Badge variant={item.isPublished ? "success" : "secondary"}>
                            {item.isPublished ? "Dipublikasi" : "Draft"}
                          </Badge>
                        </div>
                        {item.ringkasan && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.ringkasan}</p>
                        )}
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Penulis: {item.penulis}</span>
                          <span>
                            {item.publishedAt
                              ? `Dipublikasi: ${formatDate(item.publishedAt)}`
                              : `Dibuat: ${formatDate(item.createdAt)}`}
                          </span>
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

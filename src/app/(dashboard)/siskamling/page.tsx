"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
} from "lucide-react";

interface Siskamling {
  id: string;
  tanggal: string;
  shift: string | null;
  petugas: string[];
  lokasi: string | null;
  catatan: string | null;
  kejadian: string | null;
}

export default function SiskamlingPage() {
  const [items, setItems] = useState<Siskamling[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    tanggal: "",
    shift: "",
    petugas: "",
    lokasi: "",
    catatan: "",
    kejadian: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "10",
      ...(search && { search }),
    });
    const res = await fetch(`/api/v1/siskamling?${params}`);
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
      const petugasArray = form.petugas
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/v1/siskamling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          petugas: petugasArray,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ tanggal: "", shift: "", petugas: "", lokasi: "", catatan: "", kejadian: "" });
        setShowForm(false);
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Siskamling</h1>
          <p className="text-muted-foreground">Kelola jadwal sistem keamanan lingkungan</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Tutup" : "Tambah Jadwal"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Jadwal Siskamling</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tanggal *</label>
                  <Input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Shift</label>
                  <Input
                    value={form.shift}
                    onChange={(e) => setForm({ ...form, shift: e.target.value })}
                    placeholder="Contoh: Malam (22:00-06:00)"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Petugas * (pisahkan dengan koma)</label>
                  <Input
                    value={form.petugas}
                    onChange={(e) => setForm({ ...form, petugas: e.target.value })}
                    placeholder="Budi, Andi, Slamet"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Lokasi</label>
                  <Input
                    value={form.lokasi}
                    onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
                    placeholder="Lokasi jaga"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Catatan</label>
                <Input
                  value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                  placeholder="Catatan tambahan"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kejadian</label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                  value={form.kejadian}
                  onChange={(e) => setForm({ ...form, kejadian: e.target.value })}
                  placeholder="Laporan kejadian (jika ada)"
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan Jadwal"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="text-base">Jadwal Siskamling ({meta.total})</CardTitle>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Cari lokasi, catatan..."
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
                <div key={i} className="h-16 animate-pulse bg-gray-100 rounded" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Belum ada jadwal siskamling</p>
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Tambah Jadwal Pertama
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Tanggal</th>
                      <th className="text-left py-3 px-2 font-medium">Shift</th>
                      <th className="text-left py-3 px-2 font-medium">Petugas</th>
                      <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Lokasi</th>
                      <th className="text-left py-3 px-2 font-medium hidden lg:table-cell">Kejadian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 whitespace-nowrap">{formatDate(item.tanggal)}</td>
                        <td className="py-3 px-2">{item.shift || "-"}</td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-1">
                            {item.petugas.map((p, i) => (
                              <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">{item.lokasi || "-"}</td>
                        <td className="py-3 px-2 hidden lg:table-cell text-xs">
                          {item.kejadian || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Plus, Search, X } from "lucide-react";

interface Inventaris {
  id: string;
  namaBarang: string;
  kategori: string | null;
  jumlah: number;
  kondisi: string | null;
  lokasi: string | null;
  tanggalPerolehan: string | null;
  nilaiPerolehan: number | null;
  catatan: string | null;
  foto: string | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function InventarisPage() {
  const [data, setData] = useState<Inventaris[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    namaBarang: "",
    kategori: "",
    jumlah: "1",
    kondisi: "",
    lokasi: "",
    tanggalPerolehan: "",
    nilaiPerolehan: "",
    catatan: "",
  });

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (search) params.set("search", search);
    fetch(`/api/v1/inventaris?${params}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setData(result.data);
          setMeta(result.meta);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/inventaris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        setForm({ namaBarang: "", kategori: "", jumlah: "1", kondisi: "", lokasi: "", tanggalPerolehan: "", nilaiPerolehan: "", catatan: "" });
        setShowForm(false);
        setPage(1);
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
  };

  const kondisiColor = (kondisi: string | null) => {
    if (!kondisi) return "secondary";
    const lower = kondisi.toLowerCase();
    if (lower === "baik" || lower === "baru") return "default";
    if (lower === "rusak" || lower === "rusak berat") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventaris</h1>
          <p className="text-muted-foreground">Manajemen aset dan inventaris RT/RW</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Batal" : "Tambah Barang"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Barang Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nama Barang *</label>
                <Input value={form.namaBarang} onChange={(e) => setForm({ ...form, namaBarang: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Kategori</label>
                <Input value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} placeholder="Elektronik, Furniture, dll" />
              </div>
              <div>
                <label className="text-sm font-medium">Jumlah</label>
                <Input type="number" min="1" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Kondisi</label>
                <Input value={form.kondisi} onChange={(e) => setForm({ ...form, kondisi: e.target.value })} placeholder="Baik, Rusak Ringan, dll" />
              </div>
              <div>
                <label className="text-sm font-medium">Lokasi</label>
                <Input value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} placeholder="Balai RT, Pos Ronda, dll" />
              </div>
              <div>
                <label className="text-sm font-medium">Tanggal Perolehan</label>
                <Input type="date" value={form.tanggalPerolehan} onChange={(e) => setForm({ ...form, tanggalPerolehan: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Nilai Perolehan (Rp)</label>
                <Input type="number" value={form.nilaiPerolehan} onChange={(e) => setForm({ ...form, nilaiPerolehan: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Catatan</label>
                <Input value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Daftar Inventaris
              {meta && <Badge variant="secondary">{meta.total}</Badge>}
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama barang..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 animate-pulse bg-gray-200 rounded" />
              ))}
            </div>
          ) : !data.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada data inventaris</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Nama Barang</th>
                    <th className="text-left py-2 px-3 font-medium">Kategori</th>
                    <th className="text-center py-2 px-3 font-medium">Jumlah</th>
                    <th className="text-left py-2 px-3 font-medium">Kondisi</th>
                    <th className="text-left py-2 px-3 font-medium">Lokasi</th>
                    <th className="text-right py-2 px-3 font-medium">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{item.namaBarang}</td>
                      <td className="py-2 px-3">
                        {item.kategori ? (
                          <Badge variant="outline" className="text-xs">{item.kategori}</Badge>
                        ) : "-"}
                      </td>
                      <td className="py-2 px-3 text-center">{item.jumlah}</td>
                      <td className="py-2 px-3">
                        {item.kondisi ? (
                          <Badge variant={kondisiColor(item.kondisi) as "default" | "secondary" | "destructive"} className="text-xs">
                            {item.kondisi}
                          </Badge>
                        ) : "-"}
                      </td>
                      <td className="py-2 px-3">{item.lokasi || "-"}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(item.nilaiPerolehan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Halaman {meta.page} dari {meta.totalPages} ({meta.total} data)
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Sebelumnya
                </Button>
                <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

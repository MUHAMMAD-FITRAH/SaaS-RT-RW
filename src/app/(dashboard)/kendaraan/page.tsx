"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Car, Plus, Search, X } from "lucide-react";

interface Kendaraan {
  id: string;
  pemilik: string;
  jenisKendaraan: string;
  merek: string | null;
  nomorPolisi: string;
  warna: string | null;
  tahun: number | null;
  stnkBerlaku: string | null;
  foto: string | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const JENIS_OPTIONS = [
  { value: "MOTOR", label: "Motor" },
  { value: "MOBIL", label: "Mobil" },
  { value: "SEPEDA", label: "Sepeda" },
  { value: "LAINNYA", label: "Lainnya" },
];

export default function KendaraanPage() {
  const [data, setData] = useState<Kendaraan[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    pemilik: "",
    jenisKendaraan: "MOTOR",
    merek: "",
    nomorPolisi: "",
    warna: "",
    tahun: "",
    stnkBerlaku: "",
  });

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (search) params.set("search", search);
    fetch(`/api/v1/kendaraan?${params}`)
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
      const res = await fetch("/api/v1/kendaraan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        setForm({ pemilik: "", jenisKendaraan: "MOTOR", merek: "", nomorPolisi: "", warna: "", tahun: "", stnkBerlaku: "" });
        setShowForm(false);
        setPage(1);
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const jenisLabel = (jenis: string) => JENIS_OPTIONS.find((o) => o.value === jenis)?.label || jenis;

  const jenisColor = (jenis: string) => {
    switch (jenis) {
      case "MOTOR": return "default";
      case "MOBIL": return "secondary";
      case "SEPEDA": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Kendaraan</h1>
          <p className="text-muted-foreground">Manajemen data kendaraan warga</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Batal" : "Tambah Kendaraan"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Kendaraan Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Pemilik *</label>
                <Input value={form.pemilik} onChange={(e) => setForm({ ...form, pemilik: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Jenis Kendaraan *</label>
                <Select value={form.jenisKendaraan} onChange={(e) => setForm({ ...form, jenisKendaraan: e.target.value })}>
                  {JENIS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Merek</label>
                <Input value={form.merek} onChange={(e) => setForm({ ...form, merek: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Nomor Polisi *</label>
                <Input value={form.nomorPolisi} onChange={(e) => setForm({ ...form, nomorPolisi: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Warna</label>
                <Input value={form.warna} onChange={(e) => setForm({ ...form, warna: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Tahun</label>
                <Input type="number" value={form.tahun} onChange={(e) => setForm({ ...form, tahun: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">STNK Berlaku</label>
                <Input type="date" value={form.stnkBerlaku} onChange={(e) => setForm({ ...form, stnkBerlaku: e.target.value })} />
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
              <Car className="h-4 w-4" /> Daftar Kendaraan
              {meta && <Badge variant="secondary">{meta.total}</Badge>}
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pemilik/no. polisi..."
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
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada data kendaraan</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Pemilik</th>
                    <th className="text-left py-2 px-3 font-medium">Jenis</th>
                    <th className="text-left py-2 px-3 font-medium">Merek</th>
                    <th className="text-left py-2 px-3 font-medium">No. Polisi</th>
                    <th className="text-left py-2 px-3 font-medium">Warna</th>
                    <th className="text-left py-2 px-3 font-medium">Tahun</th>
                    <th className="text-left py-2 px-3 font-medium">STNK</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((k) => (
                    <tr key={k.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{k.pemilik}</td>
                      <td className="py-2 px-3">
                        <Badge variant={jenisColor(k.jenisKendaraan) as "default" | "secondary" | "outline"} className="text-xs">
                          {jenisLabel(k.jenisKendaraan)}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">{k.merek || "-"}</td>
                      <td className="py-2 px-3 font-mono">{k.nomorPolisi}</td>
                      <td className="py-2 px-3">{k.warna || "-"}</td>
                      <td className="py-2 px-3">{k.tahun || "-"}</td>
                      <td className="py-2 px-3">
                        {k.stnkBerlaku ? (
                          <Badge
                            variant={new Date(k.stnkBerlaku) < new Date() ? "destructive" : "default"}
                            className="text-xs"
                          >
                            {new Date(k.stnkBerlaku).toLocaleDateString("id-ID")}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
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

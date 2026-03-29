"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, Search, LogOut, X } from "lucide-react";

interface Tamu {
  id: string;
  namaLengkap: string;
  nik: string | null;
  alamatAsal: string;
  tujuan: string;
  wargaDikunjungi: string;
  nomorHP: string | null;
  nomorKendaraan: string | null;
  waktuDatang: string;
  waktuPulang: string | null;
  catatan: string | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TamuPage() {
  const [data, setData] = useState<Tamu[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    namaLengkap: "",
    nik: "",
    alamatAsal: "",
    tujuan: "",
    wargaDikunjungi: "",
    nomorHP: "",
    nomorKendaraan: "",
    catatan: "",
  });

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (search) params.set("search", search);
    fetch(`/api/v1/tamu?${params}`)
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
      const res = await fetch("/api/v1/tamu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        setForm({ namaLengkap: "", nik: "", alamatAsal: "", tujuan: "", wargaDikunjungi: "", nomorHP: "", nomorKendaraan: "", catatan: "" });
        setShowForm(false);
        setPage(1);
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePulang = async (id: string) => {
    const res = await fetch("/api/v1/tamu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const result = await res.json();
    if (result.success) fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Buku Tamu</h1>
          <p className="text-muted-foreground">Pencatatan tamu yang berkunjung</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Batal" : "Tambah Tamu"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Tamu Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nama Lengkap *</label>
                <Input value={form.namaLengkap} onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">NIK</label>
                <Input value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Alamat Asal *</label>
                <Input value={form.alamatAsal} onChange={(e) => setForm({ ...form, alamatAsal: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Tujuan *</label>
                <Input value={form.tujuan} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Warga Dikunjungi *</label>
                <Input value={form.wargaDikunjungi} onChange={(e) => setForm({ ...form, wargaDikunjungi: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Nomor HP</label>
                <Input value={form.nomorHP} onChange={(e) => setForm({ ...form, nomorHP: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Nomor Kendaraan</label>
                <Input value={form.nomorKendaraan} onChange={(e) => setForm({ ...form, nomorKendaraan: e.target.value })} />
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
              <Users className="h-4 w-4" /> Daftar Tamu
              {meta && <Badge variant="secondary">{meta.total}</Badge>}
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama/warga dikunjungi..."
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
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada data tamu</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Nama</th>
                    <th className="text-left py-2 px-3 font-medium">NIK</th>
                    <th className="text-left py-2 px-3 font-medium">Alamat Asal</th>
                    <th className="text-left py-2 px-3 font-medium">Tujuan</th>
                    <th className="text-left py-2 px-3 font-medium">Dikunjungi</th>
                    <th className="text-left py-2 px-3 font-medium">Waktu Datang</th>
                    <th className="text-left py-2 px-3 font-medium">Waktu Pulang</th>
                    <th className="text-center py-2 px-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((tamu) => (
                    <tr key={tamu.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{tamu.namaLengkap}</td>
                      <td className="py-2 px-3">{tamu.nik || "-"}</td>
                      <td className="py-2 px-3">{tamu.alamatAsal}</td>
                      <td className="py-2 px-3">{tamu.tujuan}</td>
                      <td className="py-2 px-3">{tamu.wargaDikunjungi}</td>
                      <td className="py-2 px-3">{new Date(tamu.waktuDatang).toLocaleString("id-ID")}</td>
                      <td className="py-2 px-3">
                        {tamu.waktuPulang ? (
                          <Badge variant="default" className="text-xs">
                            {new Date(tamu.waktuPulang).toLocaleString("id-ID")}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">Masih di lokasi</Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {!tamu.waktuPulang && (
                          <Button size="sm" variant="outline" onClick={() => handlePulang(tamu.id)}>
                            <LogOut className="h-3 w-3 mr-1" /> Pulang
                          </Button>
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

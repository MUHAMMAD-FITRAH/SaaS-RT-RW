"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Plus, Package, X } from "lucide-react";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";

interface UsahaWarga {
  id: string;
  namaUsaha: string;
  pemilik: string;
  jenis: string;
  alamat: string;
  nomorHP: string;
  deskripsi: string | null;
  _count?: { produk: number };
}

export default function UsahaWargaPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RT_ADMIN, UserRole.RW_ADMIN]}>
      <UsahaWargaContent />
    </RoleGuard>
  );
}

function UsahaWargaContent() {
  const [usahaList, setUsahaList] = useState<UsahaWarga[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    namaUsaha: "",
    pemilik: "",
    jenis: "",
    alamat: "",
    nomorHP: "",
    deskripsi: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      ...(search && { search }),
    });
    try {
      const res = await fetch(`/api/v1/usaha-warga?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsahaList(data.data);
      }
    } catch {
      // handle error silently
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/usaha-warga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setForm({
          namaUsaha: "",
          pemilik: "",
          jenis: "",
          alamat: "",
          nomorHP: "",
          deskripsi: "",
        });
        setShowForm(false);
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usaha Warga</h1>
          <p className="text-muted-foreground">Direktori usaha dan UMKM warga</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Batal" : "Tambah Usaha"}
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Cari usaha warga..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Add Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Usaha Warga</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nama Usaha</label>
                <Input
                  placeholder="Nama usaha"
                  value={form.namaUsaha}
                  onChange={(e) => setForm({ ...form, namaUsaha: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Pemilik</label>
                <Input
                  placeholder="Nama pemilik"
                  value={form.pemilik}
                  onChange={(e) => setForm({ ...form, pemilik: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Jenis Usaha</label>
                <Input
                  placeholder="Contoh: Makanan, Jasa, Retail..."
                  value={form.jenis}
                  onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Alamat</label>
                <Input
                  placeholder="Alamat usaha"
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Nomor HP</label>
                <Input
                  placeholder="08xxxxxxxxxx"
                  value={form.nomorHP}
                  onChange={(e) => setForm({ ...form, nomorHP: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Deskripsi</label>
                <Input
                  placeholder="Deskripsi singkat usaha"
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Business Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : usahaList.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg mb-2">Belum ada usaha warga terdaftar</p>
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Tambah Usaha Pertama
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {usahaList.map((usaha) => (
            <Card key={usaha.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{usaha.namaUsaha}</h3>
                    <p className="text-sm text-muted-foreground">{usaha.pemilik}</p>
                  </div>
                  <Badge variant="secondary">{usaha.jenis}</Badge>
                </div>
                {usaha.deskripsi && (
                  <p className="text-sm text-muted-foreground mb-3">{usaha.deskripsi}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>{usaha._count?.produk ?? 0} produk</span>
                  </div>
                  <span className="text-muted-foreground">{usaha.nomorHP}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Search, Phone, User, X } from "lucide-react";

interface Organisasi {
  id: string;
  nama: string;
  jabatan: string;
  urutan: number;
  foto: string | null;
  nomorHP: string | null;
  periode: string | null;
  isActive: boolean;
}

export default function OrganisasiPage() {
  const [data, setData] = useState<Organisasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    nama: "",
    jabatan: "",
    urutan: "",
    nomorHP: "",
    periode: "",
  });

  const fetchData = () => {
    setLoading(true);
    fetch("/api/v1/organisasi")
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setData(result.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/organisasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        setForm({ nama: "", jabatan: "", urutan: "", nomorHP: "", periode: "" });
        setShowForm(false);
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = data.filter(
    (o) =>
      o.nama.toLowerCase().includes(search.toLowerCase()) ||
      o.jabatan.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Struktur Organisasi</h1>
          <p className="text-muted-foreground">Pengurus RT/RW</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Batal" : "Tambah Pengurus"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Pengurus Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nama *</label>
                <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Jabatan *</label>
                <Input value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Urutan</label>
                <Input type="number" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium">Nomor HP</label>
                <Input value={form.nomorHP} onChange={(e) => setForm({ ...form, nomorHP: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Periode</label>
                <Input value={form.periode} onChange={(e) => setForm({ ...form, periode: e.target.value })} placeholder="2024-2027" />
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau jabatan..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="secondary">{filtered.length} pengurus</Badge>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-32 animate-pulse bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !filtered.length ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada data pengurus</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((org) => (
            <Card key={org.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{org.nama}</h3>
                    <Badge variant="default" className="text-xs mt-1">{org.jabatan}</Badge>
                    {org.periode && (
                      <p className="text-xs text-muted-foreground mt-2">Periode: {org.periode}</p>
                    )}
                    {org.nomorHP && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {org.nomorHP}
                      </p>
                    )}
                    <div className="mt-2">
                      <Badge variant={org.isActive ? "default" : "secondary"} className="text-xs">
                        {org.isActive ? "Aktif" : "Tidak Aktif"}
                      </Badge>
                    </div>
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

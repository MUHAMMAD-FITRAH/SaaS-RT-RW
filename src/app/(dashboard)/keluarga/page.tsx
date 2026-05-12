"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface KeluargaData {
  id: string;
  nomorKK: string;
  kepalaKeluarga: string;
  rumah: { nomorRumah: string; blok: string | null; alamat: string };
  _count: { anggota: number };
}

interface RumahOption {
  id: string;
  nomorRumah: string;
  blok: string | null;
}

export default function KeluargaPage() {
  const [keluargaList, setKeluargaList] = useState<KeluargaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [showForm, setShowForm] = useState(false);
  const [rumahOptions, setRumahOptions] = useState<RumahOption[]>([]);
  const [formData, setFormData] = useState({ nomorKK: "", kepalaKeluarga: "", rumahId: "" });
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "10", ...(search && { search }) });
    const res = await fetch(`/api/v1/keluarga?${params}`);
    const data = await res.json();
    if (data.success) { setKeluargaList(data.data); setMeta(data.meta); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (showForm) {
      fetch("/api/v1/rumah?limit=200").then(r => r.json()).then(d => {
        if (d.success) setRumahOptions(d.data);
      });
    }
  }, [showForm]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/v1/keluarga", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    setShowForm(false);
    setFormData({ nomorKK: "", kepalaKeluarga: "", rumahId: "" });
    fetchData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Keluarga</h1>
          <p className="text-muted-foreground">Kelola data kartu keluarga</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah KK
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tambah Kartu Keluarga</CardTitle></CardHeader>
          <CardContent>
            {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md mb-4">{error}</div>}
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Nomor KK (16 digit) *" value={formData.nomorKK} onChange={(e) => setFormData(p => ({ ...p, nomorKK: e.target.value }))} maxLength={16} required />
              <Input placeholder="Nama Kepala Keluarga *" value={formData.kepalaKeluarga} onChange={(e) => setFormData(p => ({ ...p, kepalaKeluarga: e.target.value }))} required />
              <Select value={formData.rumahId} onChange={(e) => setFormData(p => ({ ...p, rumahId: e.target.value }))} required>
                <option value="">Pilih Rumah *</option>
                {rumahOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    No. {r.nomorRumah}{r.blok ? ` Blok ${r.blok}` : ""}
                  </option>
                ))}
              </Select>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="text-base">Daftar Keluarga ({meta.total})</CardTitle>
            <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchData(); }} className="flex gap-2">
              <Input placeholder="Cari No.KK atau kepala keluarga..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
              <Button type="submit" variant="secondary" size="icon"><Search className="h-4 w-4" /></Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse bg-gray-100 rounded" />)}</div>
          ) : keluargaList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Belum ada data keluarga</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">No. KK</th>
                    <th className="text-left py-3 px-2 font-medium">Kepala Keluarga</th>
                    <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Rumah</th>
                    <th className="text-left py-3 px-2 font-medium">Anggota</th>
                  </tr></thead>
                  <tbody>
                    {keluargaList.map((kk) => (
                      <tr key={kk.id} className="border-b hover:bg-blue-50 cursor-pointer" onClick={() => router.push(`/keluarga/${kk.id}`)}>
                        <td className="py-3 px-2 font-mono text-xs">{kk.nomorKK}</td>
                        <td className="py-3 px-2 font-medium">{kk.kepalaKeluarga}</td>
                        <td className="py-3 px-2 hidden md:table-cell text-muted-foreground">
                          No. {kk.rumah.nomorRumah}{kk.rumah.blok ? ` Blok ${kk.rumah.blok}` : ""}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {kk._count.anggota} orang
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">Halaman {page} dari {meta.totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

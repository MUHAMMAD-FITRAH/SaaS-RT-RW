"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface RumahData {
  id: string;
  nomorRumah: string;
  blok: string | null;
  alamat: string;
  statusHuni: string;
  statusMilik: string;
  _count: { keluarga: number; kendaraan: number };
}

export default function RumahPage() {
  const router = useRouter();
  const [rumahList, setRumahList] = useState<RumahData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nomorRumah: "", blok: "", alamat: "", statusHuni: "DIHUNI", statusMilik: "MILIK_SENDIRI",
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "10", ...(search && { search }) });
    const res = await fetch(`/api/v1/rumah?${params}`);
    const data = await res.json();
    if (data.success) { setRumahList(data.data); setMeta(data.meta); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/v1/rumah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setFormData({ nomorRumah: "", blok: "", alamat: "", statusHuni: "DIHUNI", statusMilik: "MILIK_SENDIRI" });
      fetchData();
    }
  }

  const statusLabel: Record<string, string> = {
    DIHUNI: "Dihuni", TIDAK_DIHUNI: "Kosong", DISEWAKAN: "Disewakan",
    MILIK_SENDIRI: "Milik Sendiri", SEWA: "Sewa", KONTRAK: "Kontrak", LAINNYA: "Lainnya",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Rumah</h1>
          <p className="text-muted-foreground">Kelola data rumah warga</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Rumah
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tambah Rumah Baru</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input placeholder="Nomor Rumah *" value={formData.nomorRumah} onChange={(e) => setFormData(p => ({ ...p, nomorRumah: e.target.value }))} required />
              <Input placeholder="Blok" value={formData.blok} onChange={(e) => setFormData(p => ({ ...p, blok: e.target.value }))} />
              <Input placeholder="Alamat *" value={formData.alamat} onChange={(e) => setFormData(p => ({ ...p, alamat: e.target.value }))} required />
              <Select value={formData.statusHuni} onChange={(e) => setFormData(p => ({ ...p, statusHuni: e.target.value }))}>
                <option value="DIHUNI">Dihuni</option>
                <option value="TIDAK_DIHUNI">Kosong</option>
                <option value="DISEWAKAN">Disewakan</option>
              </Select>
              <Select value={formData.statusMilik} onChange={(e) => setFormData(p => ({ ...p, statusMilik: e.target.value }))}>
                <option value="MILIK_SENDIRI">Milik Sendiri</option>
                <option value="SEWA">Sewa</option>
                <option value="KONTRAK">Kontrak</option>
                <option value="LAINNYA">Lainnya</option>
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
            <CardTitle className="text-base">Daftar Rumah ({meta.total})</CardTitle>
            <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchData(); }} className="flex gap-2">
              <Input placeholder="Cari nomor/blok/alamat..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
              <Button type="submit" variant="secondary" size="icon"><Search className="h-4 w-4" /></Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse bg-gray-100 rounded" />)}</div>
          ) : rumahList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Belum ada data rumah</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Rumah</th>
                    <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Alamat</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                    <th className="text-left py-3 px-2 font-medium hidden sm:table-cell">KK</th>
                    <th className="text-left py-3 px-2 font-medium hidden sm:table-cell">Kendaraan</th>
                  </tr></thead>
                  <tbody>
                    {rumahList.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-blue-50 cursor-pointer" onClick={() => router.push(`/rumah/${r.id}`)}>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">No. {r.nomorRumah}</span>
                            {r.blok && <span className="text-muted-foreground">Blok {r.blok}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell text-muted-foreground">{r.alamat}</td>
                        <td className="py-3 px-2">
                          <Badge variant={r.statusHuni === "DIHUNI" ? "success" : "secondary"}>{statusLabel[r.statusHuni]}</Badge>
                        </td>
                        <td className="py-3 px-2 hidden sm:table-cell">{r._count.keluarga}</td>
                        <td className="py-3 px-2 hidden sm:table-cell">{r._count.kendaraan}</td>
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

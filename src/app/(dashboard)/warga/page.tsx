"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateShort } from "@/lib/utils";

interface Warga {
  id: string;
  nik: string;
  namaLengkap: string;
  jenisKelamin: string | null;
  statusAktif: string;
  pekerjaan: string | null;
  nomorHP: string | null;
  tanggalLahir: string | null;
  keluarga: {
    nomorKK: string;
    kepalaKeluarga: string;
    rumah: { nomorRumah: string; blok: string | null };
  } | null;
}

export default function WargaPage() {
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  const fetchWarga = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "10",
      ...(search && { search }),
    });

    const res = await fetch(`/api/v1/warga?${params}`);
    const data = await res.json();

    if (data.success) {
      setWargaList(data.data);
      setMeta(data.meta);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchWarga();
  }, [fetchWarga]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchWarga();
  }

  const statusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
      AKTIF: "success",
      PINDAH: "warning",
      MENINGGAL: "destructive",
      TIDAK_AKTIF: "secondary",
    };
    const labels: Record<string, string> = {
      AKTIF: "Aktif",
      PINDAH: "Pindah",
      MENINGGAL: "Meninggal",
      TIDAK_AKTIF: "Tidak Aktif",
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Warga</h1>
          <p className="text-muted-foreground">Kelola data warga RT Anda</p>
        </div>
        <Link href="/warga/tambah">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Warga
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="text-base">
              Daftar Warga ({meta.total})
            </CardTitle>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Cari nama, NIK, HP..."
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
          ) : wargaList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">Belum ada data warga</p>
              <Link href="/warga/tambah">
                <Button variant="outline">Tambah Warga Pertama</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Nama</th>
                      <th className="text-left py-3 px-2 font-medium hidden md:table-cell">NIK</th>
                      <th className="text-left py-3 px-2 font-medium hidden lg:table-cell">Alamat</th>
                      <th className="text-left py-3 px-2 font-medium hidden sm:table-cell">Status</th>
                      <th className="text-left py-3 px-2 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wargaList.map((w) => (
                      <tr key={w.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium">{w.namaLengkap}</p>
                            <p className="text-xs text-muted-foreground">
                              {w.jenisKelamin === "LAKI_LAKI" ? "L" : "P"}
                              {w.pekerjaan ? ` - ${w.pekerjaan}` : ""}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell font-mono text-xs">
                          {w.nik}
                        </td>
                        <td className="py-3 px-2 hidden lg:table-cell text-xs">
                          {w.keluarga?.rumah
                            ? `Rumah ${w.keluarga.rumah.nomorRumah}${w.keluarga.rumah.blok ? ` Blok ${w.keluarga.rumah.blok}` : ""}`
                            : "-"}
                        </td>
                        <td className="py-3 px-2 hidden sm:table-cell">
                          {statusBadge(w.statusAktif)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1">
                            <Link href={`/warga/${w.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/warga/${w.id}?edit=true`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Halaman {page} dari {meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
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

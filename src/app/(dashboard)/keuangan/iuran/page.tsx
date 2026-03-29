"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Receipt, Plus, CheckCircle, X } from "lucide-react";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";

interface JenisIuran {
  id: string;
  nama: string;
  jumlah: number;
  periode: string;
}

interface PembayaranIuran {
  id: string;
  warga: { nama: string };
  status: "LUNAS" | "BELUM";
  tanggalBayar: string | null;
  metodeBayar: string | null;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);

export default function IuranPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RT_ADMIN, UserRole.RW_ADMIN]}>
      <IuranContent />
    </RoleGuard>
  );
}

function IuranContent() {
  const [jenisIuranList, setJenisIuranList] = useState<JenisIuran[]>([]);
  const [payments, setPayments] = useState<PembayaranIuran[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [selectedJenis, setSelectedJenis] = useState<string>("");
  const [filterBulan, setFilterBulan] = useState(String(new Date().getMonth() + 1));
  const [filterTahun, setFilterTahun] = useState(String(new Date().getFullYear()));
  const [showJenisForm, setShowJenisForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ metodeBayar: "Tunai" });
  const [jenisForm, setJenisForm] = useState({
    nama: "",
    jumlah: "",
    periode: "BULANAN",
  });

  const fetchJenisIuran = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/iuran/jenis");
      const data = await res.json();
      if (data.success) {
        setJenisIuranList(data.data);
      }
    } catch {
      // handle error silently
    }
    setLoading(false);
  }, []);

  const fetchPayments = useCallback(async () => {
    if (!selectedJenis) return;
    setLoadingPayments(true);
    try {
      const params = new URLSearchParams({
        jenisIuranId: selectedJenis,
        bulan: filterBulan,
        tahun: filterTahun,
      });
      const res = await fetch(`/api/v1/iuran/pembayaran?${params}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.data);
      }
    } catch {
      // handle error silently
    }
    setLoadingPayments(false);
  }, [selectedJenis, filterBulan, filterTahun]);

  useEffect(() => {
    fetchJenisIuran();
  }, [fetchJenisIuran]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  async function handleAddJenis(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/iuran/jenis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...jenisForm,
          jumlah: parseFloat(jenisForm.jumlah),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setJenisForm({ nama: "", jumlah: "", periode: "BULANAN" });
        setShowJenisForm(false);
        fetchJenisIuran();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCatatBayar(pembayaranId: string) {
    try {
      const res = await fetch("/api/v1/iuran/pembayaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pembayaranId,
          metodeBayar: payForm.metodeBayar,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPayingId(null);
        fetchPayments();
      }
    } catch {
      // handle error silently
    }
  }

  async function handleGenerateTagihan() {
    if (!selectedJenis) return;
    try {
      const res = await fetch("/api/v1/iuran/pembayaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          jenisIuranId: selectedJenis,
          bulan: parseInt(filterBulan),
          tahun: parseInt(filterTahun),
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPayments();
      }
    } catch {
      // handle error silently
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Iuran Warga</h1>
          <p className="text-muted-foreground">Kelola jenis iuran dan pembayaran warga</p>
        </div>
      </div>

      {/* Jenis Iuran Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Jenis Iuran</CardTitle>
            <Button size="sm" onClick={() => setShowJenisForm(!showJenisForm)}>
              {showJenisForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {showJenisForm ? "Batal" : "Tambah Jenis"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showJenisForm && (
            <form onSubmit={handleAddJenis} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-1 block">Nama Iuran</label>
                <Input
                  placeholder="Contoh: Iuran Kebersihan"
                  value={jenisForm.nama}
                  onChange={(e) => setJenisForm({ ...jenisForm, nama: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Jumlah (Rp)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={jenisForm.jumlah}
                  onChange={(e) => setJenisForm({ ...jenisForm, jumlah: e.target.value })}
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Periode</label>
                <Select
                  value={jenisForm.periode}
                  onChange={(e) => setJenisForm({ ...jenisForm, periode: e.target.value })}
                >
                  <option value="BULANAN">Bulanan</option>
                  <option value="TAHUNAN">Tahunan</option>
                  <option value="INSIDENTAL">Insidental</option>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse bg-gray-100 rounded" />
              ))}
            </div>
          ) : jenisIuranList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Belum ada jenis iuran</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jenisIuranList.map((jenis) => (
                <Card
                  key={jenis.id}
                  className={`cursor-pointer transition-colors ${selectedJenis === jenis.id ? "border-primary bg-primary/5" : "hover:bg-gray-50"}`}
                  onClick={() => setSelectedJenis(jenis.id)}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{jenis.nama}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(jenis.jumlah)}</p>
                      </div>
                      <Badge variant="outline">{jenis.periode}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Tracking Section */}
      {selectedJenis && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <CardTitle className="text-base">Pembayaran Iuran</CardTitle>
              <div className="flex gap-2 items-center">
                <Select
                  value={filterBulan}
                  onChange={(e) => setFilterBulan(e.target.value)}
                  className="w-32"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {new Date(2000, i).toLocaleString("id-ID", { month: "long" })}
                    </option>
                  ))}
                </Select>
                <Select
                  value={filterTahun}
                  onChange={(e) => setFilterTahun(e.target.value)}
                  className="w-24"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={String(year)}>
                        {year}
                      </option>
                    );
                  })}
                </Select>
                <Button size="sm" variant="outline" onClick={handleGenerateTagihan}>
                  Generate Tagihan
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPayments ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse bg-gray-100 rounded" />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Belum ada data pembayaran untuk periode ini</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleGenerateTagihan}>
                  Generate Tagihan
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Warga</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-left py-3 px-2 font-medium hidden sm:table-cell">Tanggal Bayar</th>
                      <th className="text-left py-3 px-2 font-medium hidden sm:table-cell">Metode</th>
                      <th className="text-right py-3 px-2 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium">{p.warga.nama}</td>
                        <td className="py-3 px-2">
                          <Badge variant={p.status === "LUNAS" ? "default" : "destructive"}>
                            {p.status === "LUNAS" ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Lunas
                              </span>
                            ) : (
                              "Belum"
                            )}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 hidden sm:table-cell text-muted-foreground">
                          {p.tanggalBayar
                            ? new Date(p.tanggalBayar).toLocaleDateString("id-ID")
                            : "-"}
                        </td>
                        <td className="py-3 px-2 hidden sm:table-cell text-muted-foreground">
                          {p.metodeBayar || "-"}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {p.status === "BELUM" && (
                            <>
                              {payingId === p.id ? (
                                <div className="flex items-center gap-2 justify-end">
                                  <Select
                                    value={payForm.metodeBayar}
                                    onChange={(e) => setPayForm({ metodeBayar: e.target.value })}
                                    className="w-28"
                                  >
                                    <option value="Tunai">Tunai</option>
                                    <option value="Transfer">Transfer</option>
                                    <option value="QRIS">QRIS</option>
                                  </Select>
                                  <Button size="sm" onClick={() => handleCatatBayar(p.id)}>
                                    Simpan
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setPayingId(null)}>
                                    Batal
                                  </Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => setPayingId(p.id)}>
                                  Catat Bayar
                                </Button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

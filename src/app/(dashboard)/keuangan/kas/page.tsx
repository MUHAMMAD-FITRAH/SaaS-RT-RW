"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Wallet, Plus, ArrowUpCircle, ArrowDownCircle, X, Camera,
  Loader2, Eye, Trash2,
} from "lucide-react";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";

interface KasTransaction {
  id: string;
  tanggal: string;
  jenis: "MASUK" | "KELUAR";
  kategori: string;
  keterangan: string;
  jumlah: number;
  buktiUrl: string | null;
  pencatat: string;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function KasPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RT_ADMIN, UserRole.RW_ADMIN]}>
      <KasContent />
    </RoleGuard>
  );
}

function KasContent() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [transactions, setTransactions] = useState<KasTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterJenis, setFilterJenis] = useState<string>("");
  const [filterBulan, setFilterBulan] = useState<string>("");
  const [filterTahun, setFilterTahun] = useState(String(new Date().getFullYear()));
  const [summary, setSummary] = useState({ totalMasuk: 0, totalKeluar: 0, saldo: 0 });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    jenis: "MASUK",
    kategori: "",
    keterangan: "",
    jumlah: "",
    buktiUrl: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (filterJenis) params.set("jenis", filterJenis);

    const res = await fetch(`/api/v1/kas?${params}`);
    const data = await res.json();

    if (data.success) {
      let txList: KasTransaction[] = data.data;

      // Filter by month/year on the client side
      if (filterBulan) {
        txList = txList.filter((t) => {
          const d = new Date(t.tanggal);
          return String(d.getMonth() + 1) === filterBulan && String(d.getFullYear()) === filterTahun;
        });
      } else if (filterTahun) {
        txList = txList.filter((t) => String(new Date(t.tanggal).getFullYear()) === filterTahun);
      }

      setTransactions(txList);

      // Recalculate summary from filtered data
      const masuk = txList.filter((t) => t.jenis === "MASUK").reduce((s, t) => s + t.jumlah, 0);
      const keluar = txList.filter((t) => t.jenis === "KELUAR").reduce((s, t) => s + t.jumlah, 0);
      setSummary({ totalMasuk: masuk, totalKeluar: keluar, saldo: masuk - keluar });
    }
    setLoading(false);
  }, [filterJenis, filterBulan, filterTahun]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleUploadBukti(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "kas");
    const res = await fetch("/api/v1/upload", { method: "POST", body: fd });
    const d = await res.json();
    setUploading(false);
    if (d.data?.url) setForm((p) => ({ ...p, buktiUrl: d.data.url }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/v1/kas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, jumlah: parseFloat(form.jumlah) }),
    });
    if (res.ok) {
      setForm({ tanggal: new Date().toISOString().split("T")[0], jenis: "MASUK", kategori: "", keterangan: "", jumlah: "", buktiUrl: "" });
      setShowForm(false);
      fetchData();
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus transaksi ini?")) return;
    setDeleting(id);
    await fetch(`/api/v1/kas?id=${id}`, { method: "DELETE" });
    setDeleting(null);
    fetchData();
  }

  const BULAN_LABEL = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kas RT</h1>
          <p className="text-muted-foreground text-sm">Kelola keuangan kas RT Anda</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Batal" : "Tambah Transaksi"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg shrink-0">
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pemasukan</p>
                <p className="font-bold text-green-600 text-sm">{formatCurrency(summary.totalMasuk)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg shrink-0">
                <ArrowDownCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pengeluaran</p>
                <p className="font-bold text-red-600 text-sm">{formatCurrency(summary.totalKeluar)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Wallet className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`font-bold text-sm ${summary.saldo >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  {formatCurrency(summary.saldo)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Tanggal</label>
                <Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Jenis</label>
                <Select value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })} required>
                  <option value="MASUK">Pemasukan</option>
                  <option value="KELUAR">Pengeluaran</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Kategori</label>
                <Input placeholder="Iuran, Listrik, Kebersihan..." value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Keterangan</label>
                <Input placeholder="Keterangan detail" value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Jumlah (Rp)</label>
                <Input type="number" placeholder="0" value={form.jumlah}
                  onChange={(e) => setForm({ ...form, jumlah: e.target.value })} min="1" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Bukti (opsional)</label>
                {form.buktiUrl ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 truncate flex-1">✓ File ter-upload</span>
                    <button type="button" className="text-xs text-red-500" onClick={() => setForm(p => ({ ...p, buktiUrl: "" }))}>Hapus</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary w-full">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {uploading ? "Mengupload..." : "Upload Struk / Bukti"}
                  </button>
                )}
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadBukti} />
              </div>
              <div className="col-span-full flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Simpan
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button variant={filterJenis === "" ? "default" : "outline"} size="sm" onClick={() => setFilterJenis("")}>Semua</Button>
        <Button variant={filterJenis === "MASUK" ? "default" : "outline"} size="sm" onClick={() => setFilterJenis("MASUK")}>Masuk</Button>
        <Button variant={filterJenis === "KELUAR" ? "default" : "outline"} size="sm" onClick={() => setFilterJenis("KELUAR")}>Keluar</Button>
        <div className="flex-1" />
        <Select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} className="w-28 h-8 text-sm">
          <option value="">Semua Bulan</option>
          {BULAN_LABEL.map((b, i) => <option key={i + 1} value={String(i + 1)}>{b}</option>)}
        </Select>
        <Select value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)} className="w-20 h-8 text-sm">
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </Select>
      </div>

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Transaksi ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 animate-pulse bg-gray-100 rounded" />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Belum ada transaksi</p>
              <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>Tambah Transaksi</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 px-2 font-medium">Tanggal</th>
                    <th className="py-3 px-2 font-medium">Jenis</th>
                    <th className="py-3 px-2 font-medium">Kategori</th>
                    <th className="py-3 px-2 font-medium hidden md:table-cell">Keterangan</th>
                    <th className="py-3 px-2 font-medium text-right">Jumlah</th>
                    <th className="py-3 px-2 font-medium hidden lg:table-cell">Pencatat</th>
                    <th className="py-3 px-2 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="py-2.5 px-2 text-xs">{new Date(t.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="py-2.5 px-2">
                        <Badge variant={t.jenis === "MASUK" ? "default" : "destructive"} className="text-xs">
                          {t.jenis === "MASUK" ? "Masuk" : "Keluar"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-xs">{t.kategori}</td>
                      <td className="py-2.5 px-2 hidden md:table-cell text-xs text-muted-foreground">{t.keterangan}</td>
                      <td className={`py-2.5 px-2 text-right font-medium text-sm ${t.jenis === "MASUK" ? "text-green-600" : "text-red-600"}`}>
                        {t.jenis === "MASUK" ? "+" : "-"}{formatCurrency(t.jumlah)}
                      </td>
                      <td className="py-2.5 px-2 hidden lg:table-cell text-xs text-muted-foreground">{t.pencatat}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex gap-1">
                          {t.buktiUrl && (
                            <a href={t.buktiUrl} target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Lihat bukti">
                                <Eye className="h-3 w-3" />
                              </Button>
                            </a>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(t.id)} disabled={deleting === t.id} title="Hapus">
                            {deleting === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

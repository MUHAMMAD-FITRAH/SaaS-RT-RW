"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Wallet, Plus, ArrowUpCircle, ArrowDownCircle, X } from "lucide-react";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";

interface KasTransaction {
  id: string;
  tanggal: string;
  jenis: "MASUK" | "KELUAR";
  kategori: string;
  keterangan: string;
  jumlah: number;
  pencatat: string;
}

interface Summary {
  totalMasuk: number;
  totalKeluar: number;
  saldo: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);

export default function KasPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RT_ADMIN, UserRole.RW_ADMIN]}>
      <KasContent />
    </RoleGuard>
  );
}

function KasContent() {
  const [transactions, setTransactions] = useState<KasTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterJenis, setFilterJenis] = useState<string>("");
  const [summary, setSummary] = useState<Summary>({ totalMasuk: 0, totalKeluar: 0, saldo: 0 });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    jenis: "MASUK",
    kategori: "",
    keterangan: "",
    jumlah: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      ...(filterJenis && { jenis: filterJenis }),
    });

    try {
      const res = await fetch(`/api/v1/kas?${params}`);
      const data = await res.json();

      if (data.success) {
        setTransactions(data.data);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch {
      // handle error silently
    }
    setLoading(false);
  }, [filterJenis]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/kas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          jumlah: parseFloat(form.jumlah),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setForm({
          tanggal: new Date().toISOString().split("T")[0],
          jenis: "MASUK",
          kategori: "",
          keterangan: "",
          jumlah: "",
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
          <h1 className="text-2xl font-bold">Kas RT</h1>
          <p className="text-muted-foreground">Kelola keuangan kas RT Anda</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Batal" : "Tambah Transaksi"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Masuk</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalMasuk)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowDownCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Keluar</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalKeluar)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(summary.saldo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filterJenis === "" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterJenis("")}
        >
          Semua
        </Button>
        <Button
          variant={filterJenis === "MASUK" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterJenis("MASUK")}
        >
          Masuk
        </Button>
        <Button
          variant={filterJenis === "KELUAR" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterJenis("KELUAR")}
        >
          Keluar
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Tanggal</label>
                <Input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Jenis</label>
                <Select
                  value={form.jenis}
                  onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                  required
                >
                  <option value="MASUK">Pemasukan</option>
                  <option value="KELUAR">Pengeluaran</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Kategori</label>
                <Input
                  placeholder="Contoh: Iuran, Sumbangan..."
                  value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Keterangan</label>
                <Input
                  placeholder="Keterangan transaksi"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Jumlah (Rp)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.jumlah}
                  onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
                  min="1"
                  required
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

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse bg-gray-100 rounded" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg mb-2">Belum ada transaksi kas</p>
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Tambah Transaksi Pertama
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Tanggal</th>
                    <th className="text-left py-3 px-2 font-medium">Jenis</th>
                    <th className="text-left py-3 px-2 font-medium">Kategori</th>
                    <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Keterangan</th>
                    <th className="text-right py-3 px-2 font-medium">Jumlah</th>
                    <th className="text-left py-3 px-2 font-medium hidden lg:table-cell">Pencatat</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2 text-xs">
                        {new Date(t.tanggal).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={t.jenis === "MASUK" ? "default" : "destructive"}>
                          {t.jenis === "MASUK" ? "Masuk" : "Keluar"}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">{t.kategori}</td>
                      <td className="py-3 px-2 hidden md:table-cell text-muted-foreground">
                        {t.keterangan}
                      </td>
                      <td className={`py-3 px-2 text-right font-medium ${t.jenis === "MASUK" ? "text-green-600" : "text-red-600"}`}>
                        {t.jenis === "MASUK" ? "+" : "-"}{formatCurrency(t.jumlah)}
                      </td>
                      <td className="py-3 px-2 hidden lg:table-cell text-muted-foreground">
                        {t.pencatat}
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

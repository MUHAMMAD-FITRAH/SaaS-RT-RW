"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ShieldCheck, Plus, Users, X } from "lucide-react";
import { RoleGuard } from "@/components/shared/role-guard";
import { UserRole } from "@prisma/client";

interface PosSecurityLog {
  id: string;
  tanggal: string;
  petugas: string;
  shift: string | null;
  kejadian: string | null;
  tamuMasuk: number;
  tamuKeluar: number;
  kendaraanMasuk: number;
  kendaraanKeluar: number;
  catatan: string | null;
}

export default function PosSecurityPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.RT_ADMIN, UserRole.RW_ADMIN]}>
      <PosSecurityContent />
    </RoleGuard>
  );
}

function PosSecurityContent() {
  const [logs, setLogs] = useState<PosSecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    petugas: "",
    shift: "",
    kejadian: "",
    tamuMasuk: "0",
    tamuKeluar: "0",
    kendaraanMasuk: "0",
    kendaraanKeluar: "0",
    catatan: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      ...(dateFrom && { from: dateFrom }),
      ...(dateTo && { to: dateTo }),
    });
    try {
      const res = await fetch(`/api/v1/pos-security?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch {
      // handle error silently
    }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/pos-security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tamuMasuk: parseInt(form.tamuMasuk),
          tamuKeluar: parseInt(form.tamuKeluar),
          kendaraanMasuk: parseInt(form.kendaraanMasuk),
          kendaraanKeluar: parseInt(form.kendaraanKeluar),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setForm({
          tanggal: new Date().toISOString().split("T")[0],
          petugas: "",
          shift: "",
          kejadian: "",
          tamuMasuk: "0",
          tamuKeluar: "0",
          kendaraanMasuk: "0",
          kendaraanKeluar: "0",
          catatan: "",
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
          <h1 className="text-2xl font-bold">Pos Security</h1>
          <p className="text-muted-foreground">Log harian keamanan pos jaga</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Batal" : "Tambah Log"}
        </Button>
      </div>

      {/* Date Range Filter */}
      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <label className="text-sm font-medium mb-1 block">Dari Tanggal</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Sampai Tanggal</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Log Harian</CardTitle>
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
                <label className="text-sm font-medium mb-1 block">Petugas</label>
                <Input
                  placeholder="Nama petugas"
                  value={form.petugas}
                  onChange={(e) => setForm({ ...form, petugas: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Shift</label>
                <Select
                  value={form.shift}
                  onChange={(e) => setForm({ ...form, shift: e.target.value })}
                >
                  <option value="">Pilih Shift</option>
                  <option value="Pagi">Pagi</option>
                  <option value="Siang">Siang</option>
                  <option value="Malam">Malam</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Kejadian</label>
                <Input
                  placeholder="Kejadian khusus (jika ada)"
                  value={form.kejadian}
                  onChange={(e) => setForm({ ...form, kejadian: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tamu Masuk</label>
                <Input
                  type="number"
                  value={form.tamuMasuk}
                  onChange={(e) => setForm({ ...form, tamuMasuk: e.target.value })}
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tamu Keluar</label>
                <Input
                  type="number"
                  value={form.tamuKeluar}
                  onChange={(e) => setForm({ ...form, tamuKeluar: e.target.value })}
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Kendaraan Masuk</label>
                <Input
                  type="number"
                  value={form.kendaraanMasuk}
                  onChange={(e) => setForm({ ...form, kendaraanMasuk: e.target.value })}
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Kendaraan Keluar</label>
                <Input
                  type="number"
                  value={form.kendaraanKeluar}
                  onChange={(e) => setForm({ ...form, kendaraanKeluar: e.target.value })}
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Catatan</label>
                <Input
                  placeholder="Catatan tambahan"
                  value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Menyimpan..." : "Simpan Log"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5" />
            Log Pos Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse bg-gray-100 rounded" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg mb-2">Belum ada log keamanan</p>
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Tambah Log Pertama
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Tanggal</th>
                    <th className="text-left py-3 px-2 font-medium">Petugas</th>
                    <th className="text-left py-3 px-2 font-medium">Shift</th>
                    <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Kejadian</th>
                    <th className="text-center py-3 px-2 font-medium hidden sm:table-cell">Tamu (M/K)</th>
                    <th className="text-center py-3 px-2 font-medium hidden sm:table-cell">Kendaraan (M/K)</th>
                    <th className="text-left py-3 px-2 font-medium hidden lg:table-cell">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2 text-xs">
                        {new Date(log.tanggal).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-3 px-2 font-medium">{log.petugas}</td>
                      <td className="py-3 px-2">{log.shift || "-"}</td>
                      <td className="py-3 px-2 hidden md:table-cell text-muted-foreground">
                        {log.kejadian || "-"}
                      </td>
                      <td className="py-3 px-2 hidden sm:table-cell text-center">
                        <span className="text-green-600">{log.tamuMasuk}</span>
                        {" / "}
                        <span className="text-red-600">{log.tamuKeluar}</span>
                      </td>
                      <td className="py-3 px-2 hidden sm:table-cell text-center">
                        <span className="text-green-600">{log.kendaraanMasuk}</span>
                        {" / "}
                        <span className="text-red-600">{log.kendaraanKeluar}</span>
                      </td>
                      <td className="py-3 px-2 hidden lg:table-cell text-muted-foreground">
                        {log.catatan || "-"}
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

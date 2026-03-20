"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    rtNumber: "",
    rwNumber: "",
    kelurahan: "",
    kecamatan: "",
    kota: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Password tidak cocok");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mendaftar");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Daftar RT Online</CardTitle>
        <CardDescription>
          Buat akun baru untuk mengelola RT/RW Anda
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Lengkap</label>
            <Input
              placeholder="Nama lengkap Anda"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="email@contoh.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Min. 6 karakter"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Konfirmasi</label>
              <Input
                type="password"
                placeholder="Ulangi password"
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                required
              />
            </div>
          </div>
          <hr />
          <p className="text-sm font-medium text-muted-foreground">
            Informasi RT/RW
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nomor RT</label>
              <Input
                placeholder="001"
                value={form.rtNumber}
                onChange={(e) => updateField("rtNumber", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nomor RW</label>
              <Input
                placeholder="012"
                value={form.rwNumber}
                onChange={(e) => updateField("rwNumber", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Kelurahan</label>
            <Input
              placeholder="Nama kelurahan"
              value={form.kelurahan}
              onChange={(e) => updateField("kelurahan", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kecamatan</label>
              <Input
                placeholder="Nama kecamatan"
                value={form.kecamatan}
                onChange={(e) => updateField("kecamatan", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kota</label>
              <Input
                placeholder="Nama kota"
                value={form.kota}
                onChange={(e) => updateField("kota", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Memproses..." : "Daftar Sekarang"}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Masuk
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

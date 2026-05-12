"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, UserPlus, Building2, Users, CheckCircle2, Loader2, Search } from "lucide-react";

// ─── Warga Registration ──────────────────────────────────────────────────────

function WargaRegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<"nik" | "form" | "done">("nik");
  const [nik, setNik] = useState("");
  const [nikInfo, setNikInfo] = useState<{ namaLengkap: string; rt: string } | null>(null);
  const [nikError, setNikError] = useState("");
  const [checkingNik, setCheckingNik] = useState(false);

  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCekNIK() {
    if (nik.length !== 16) { setNikError("NIK harus 16 digit"); return; }
    setCheckingNik(true);
    setNikError("");
    const res = await fetch(`/api/v1/auth/register-warga?nik=${nik}`);
    const d = await res.json();
    setCheckingNik(false);
    if (!res.ok) { setNikError(d.error); return; }
    setNikInfo(d.data);
    setStep("form");
  }

  async function handleDaftar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Password tidak cocok"); return;
    }
    setLoading(true);
    const res = await fetch("/api/v1/auth/register-warga", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nik, email: form.email, password: form.password }),
    });
    const d = await res.json();
    setLoading(false);
    if (!res.ok) { setError(d.error); return; }
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="text-center space-y-4 py-4">
        <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
        <h3 className="text-lg font-semibold">Akun Berhasil Dibuat!</h3>
        <p className="text-sm text-muted-foreground">
          Selamat datang, <strong>{nikInfo?.namaLengkap}</strong>.<br />
          Akun Anda sudah siap digunakan.
        </p>
        <Button className="w-full" onClick={() => router.push("/login")}>
          Login Sekarang
        </Button>
      </div>
    );
  }

  if (step === "nik") {
    return (
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <strong>Cara Daftar:</strong> Pastikan data Anda sudah diinput oleh pengurus RT terlebih dahulu, lalu masukkan NIK Anda.
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Nomor Induk Kependudukan (NIK)</label>
          <Input
            placeholder="16 digit angka"
            value={nik}
            onChange={(e) => { setNik(e.target.value.replace(/\D/g, "").slice(0, 16)); setNikError(""); }}
            maxLength={16}
          />
          {nikError && <p className="text-xs text-red-600">{nikError}</p>}
          <p className="text-xs text-muted-foreground">{nik.length}/16 digit</p>
        </div>
        <Button className="w-full" onClick={handleCekNIK} disabled={nik.length !== 16 || checkingNik}>
          {checkingNik ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengecek...</> : <><Search className="h-4 w-4 mr-2" />Cek NIK</>}
        </Button>
      </div>
    );
  }

  // step === "form"
  return (
    <form onSubmit={handleDaftar} className="space-y-4">
      {/* NIK Info card */}
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-1">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-800">{nikInfo?.namaLengkap}</p>
        </div>
        <p className="text-xs text-green-700 ml-6">{nikInfo?.rt}</p>
        <button
          type="button"
          className="text-xs text-blue-600 hover:underline ml-6"
          onClick={() => { setStep("nik"); setNikInfo(null); }}
        >
          Ganti NIK
        </button>
      </div>

      {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input type="email" placeholder="email@contoh.com" value={form.email}
          onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Password</label>
        <Input type="password" placeholder="Minimal 8 karakter" value={form.password}
          onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} required minLength={8} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Konfirmasi Password</label>
        <Input type="password" placeholder="Ulangi password" value={form.confirmPassword}
          onChange={(e) => setForm(p => ({ ...p, confirmPassword: e.target.value }))} required />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mendaftar...</> : "Daftar Sekarang"}
      </Button>
    </form>
  );
}

// ─── RT Admin Registration ───────────────────────────────────────────────────

function RTRegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    rtNumber: "", rwNumber: "", kelurahan: "", kecamatan: "", kota: "",
  });

  function update(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError("Password tidak cocok"); return; }
    setError("");
    setLoading(true);

    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();

    if (!res.ok) { setError(d.error || "Gagal mendaftar"); setLoading(false); return; }

    // Auto-login setelah daftar
    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data Pribadi</p>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Nama Lengkap *</label>
          <Input placeholder="Nama ketua RT / pendaftar" value={form.name}
            onChange={(e) => update("name", e.target.value)} required />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Email *</label>
          <Input type="email" placeholder="email@contoh.com" value={form.email}
            onChange={(e) => update("email", e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Password *</label>
            <Input type="password" placeholder="Min. 8 karakter" value={form.password}
              onChange={(e) => update("password", e.target.value)} required minLength={8} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Konfirmasi *</label>
            <Input type="password" placeholder="Ulangi password" value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)} required />
          </div>
        </div>
      </div>

      <hr />
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Informasi RT/RW</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Nomor RT *</label>
          <Input placeholder="001" value={form.rtNumber}
            onChange={(e) => update("rtNumber", e.target.value)} required />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Nomor RW *</label>
          <Input placeholder="001" value={form.rwNumber}
            onChange={(e) => update("rwNumber", e.target.value)} required />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Kelurahan</label>
          <Input placeholder="Nama kelurahan" value={form.kelurahan}
            onChange={(e) => update("kelurahan", e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Kecamatan</label>
          <Input placeholder="Nama kecamatan" value={form.kecamatan}
            onChange={(e) => update("kecamatan", e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-sm font-medium">Kota / Kabupaten</label>
          <Input placeholder="Nama kota" value={form.kota}
            onChange={(e) => update("kota", e.target.value)} />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : "Daftar RT Sekarang"}
      </Button>
    </form>
  );
}

// ─── Main Register Page ──────────────────────────────────────────────────────

export default function RegisterPage() {
  const [mode, setMode] = useState<"rt" | "warga">("warga");

  return (
    <div className="space-y-4 w-full max-w-md">
      <Link href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Kembali ke Beranda
      </Link>

      {/* Tab switcher */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setMode("warga")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            mode === "warga" ? "bg-white shadow text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" /> Daftar sebagai Warga
        </button>
        <button
          onClick={() => setMode("rt")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            mode === "rt" ? "bg-white shadow text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" /> Daftar RT Baru
        </button>
      </div>

      <Card>
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {mode === "warga"
              ? <Users className="h-6 w-6 text-primary" />
              : <Building2 className="h-6 w-6 text-primary" />
            }
          </div>
          <CardTitle className="text-lg">
            {mode === "warga" ? "Daftar sebagai Warga" : "Daftarkan RT Baru"}
          </CardTitle>
          <CardDescription>
            {mode === "warga"
              ? "Daftar menggunakan NIK Anda — data harus sudah ada di sistem RT"
              : "Buat akun untuk mengelola administrasi RT secara digital"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mode === "warga" ? <WargaRegisterForm /> : <RTRegisterForm />}
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Masuk
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

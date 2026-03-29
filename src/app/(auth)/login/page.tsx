"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogIn, Server, Shield, Building2, Users } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    label: "Admin Server",
    description: "Back Office Developer",
    email: "superadmin@rt-online.id",
    icon: Server,
    color: "text-red-600",
    bg: "bg-red-50 hover:bg-red-100",
    badge: "destructive" as const,
  },
  {
    label: "Admin RT",
    description: "Back Office Pengelola",
    email: "admin@rt-online.id",
    icon: Shield,
    color: "text-blue-600",
    bg: "bg-blue-50 hover:bg-blue-100",
    badge: "secondary" as const,
  },
  {
    label: "Admin RW/Lurah",
    description: "Pengawasan & Persetujuan",
    email: "rw@rt-online.id",
    icon: Building2,
    color: "text-purple-600",
    bg: "bg-purple-50 hover:bg-purple-100",
    badge: "default" as const,
  },
  {
    label: "Warga",
    description: "User / Installer Apps",
    email: "warga@rt-online.id",
    icon: Users,
    color: "text-green-600",
    bg: "bg-green-50 hover:bg-green-100",
    badge: "outline" as const,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  function loginAsDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("password123");
  }

  return (
    <div className="space-y-4 w-full max-w-md">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Masuk ke RT Online</CardTitle>
          <CardDescription>
            Masukkan email dan password Anda
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
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@rt-online.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Belum punya akun?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Daftar Sekarang
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Demo accounts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Demo Login (password: password123)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => loginAsDemo(account.email)}
              className={`p-3 rounded-lg border text-left transition-colors ${account.bg}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <account.icon className={`h-4 w-4 ${account.color}`} />
                <span className="text-xs font-semibold">{account.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{account.description}</p>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

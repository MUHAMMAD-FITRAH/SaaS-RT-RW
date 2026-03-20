import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Home, CreditCard, Shield, BarChart3, FileText, Check } from "lucide-react";
import { TIER_PRICES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">RT Online</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Masuk</Button>
            </Link>
            <Link href="/register">
              <Button>Daftar Gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            Platform #1 Manajemen RT/RW di Indonesia
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Kelola RT/RW Anda
            <br />
            Secara Digital
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Sistem manajemen lengkap untuk pendataan warga, keuangan, surat-menyurat,
            dan administrasi RT/RW. Semua dalam satu platform.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-base">
                Mulai Gratis 14 Hari
              </Button>
            </Link>
            <Link href="#fitur">
              <Button size="lg" variant="outline" className="text-base">
                Lihat Fitur
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Fitur Lengkap untuk RT/RW Anda
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Pendataan Warga",
                desc: "Kelola data warga, keluarga, rumah, tamu, dan kendaraan secara digital dengan foto dan dokumen.",
              },
              {
                icon: CreditCard,
                title: "Keuangan & Iuran",
                desc: "Catat kas RT, kelola iuran bulanan, lacak tunggakan, dan buat laporan keuangan otomatis.",
              },
              {
                icon: FileText,
                title: "Surat & Administrasi",
                desc: "Buat surat pengantar dan keterangan dengan tanda tangan digital. Proses cepat dan paperless.",
              },
              {
                icon: BarChart3,
                title: "Laporan & Statistik",
                desc: "Dashboard interaktif dengan grafik statistik kependudukan dan keuangan RT secara real-time.",
              },
              {
                icon: Shield,
                title: "Keamanan & Siskamling",
                desc: "Jadwal ronda, pencatatan pos security, dan pendataan tamu untuk keamanan lingkungan.",
              },
              {
                icon: Home,
                title: "Multi-RT & Skalabel",
                desc: "Satu platform untuk banyak RT. Setiap RT memiliki data terpisah dan aman.",
              },
            ].map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            Pilih Paket yang Sesuai
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Mulai gratis 14 hari. Tanpa kartu kredit.
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                tier: "TIER_A" as const,
                name: "Basic",
                features: ["49 fitur lengkap", "Pendataan warga & rumah", "Keuangan & iuran", "Surat digital", "Laporan dasar"],
                popular: false,
              },
              {
                tier: "TIER_B" as const,
                name: "Standard",
                features: ["52 fitur lengkap", "Semua fitur Basic", "Usaha/Lapak warga", "Usulan pembangunan", "APK Ronda"],
                popular: true,
              },
              {
                tier: "TIER_C" as const,
                name: "Premium",
                features: ["53 fitur lengkap", "Semua fitur Standard", "Pos Security", "Katalog produk warga", "Prioritas support"],
                popular: false,
              },
            ].map((plan) => (
              <Card
                key={plan.tier}
                className={plan.popular ? "border-primary shadow-lg scale-105" : ""}
              >
                <CardHeader>
                  {plan.popular && (
                    <Badge className="w-fit mb-2">Paling Populer</Badge>
                  )}
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="text-3xl font-bold">
                    {formatCurrency(TIER_PRICES[plan.tier].monthly)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /bulan
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="block mt-6">
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      Mulai Gratis
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} RT Online. Sistem Manajemen RT/RW Digital.</p>
        </div>
      </footer>
    </div>
  );
}

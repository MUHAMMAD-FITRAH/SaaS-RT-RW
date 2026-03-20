"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { canAccess, Feature, getTierLabel } from "@/lib/features";
import { SubscriptionTier } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  Home,
  UserCheck,
  Car,
  UserPlus,
  FileText,
  Wallet,
  Receipt,
  Calendar,
  Newspaper,
  HeartHandshake,
  Shield,
  MessageSquare,
  Package,
  Building2,
  Store,
  HardHat,
  ShieldCheck,
  BarChart3,
  Settings,
  CreditCard,
  Lock,
  X,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  feature?: Feature;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "Utama",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Pendataan",
    items: [
      { label: "Data Warga", href: "/warga", icon: Users },
      { label: "Data Rumah", href: "/rumah", icon: Home },
      { label: "Data Keluarga", href: "/keluarga", icon: UserCheck },
      { label: "Tamu", href: "/tamu", icon: UserPlus, feature: Feature.PENDATAAN_TAMU },
      { label: "Kendaraan", href: "/kendaraan", icon: Car, feature: Feature.PENDATAAN_KENDARAAN },
    ],
  },
  {
    title: "Administrasi",
    items: [
      { label: "Surat", href: "/surat", icon: FileText, feature: Feature.SURAT_KETERANGAN },
      { label: "Organisasi", href: "/organisasi", icon: Building2, feature: Feature.STRUKTUR_ORGANISASI },
      { label: "Inventaris", href: "/inventaris", icon: Package, feature: Feature.BARANG_INVENTARIS },
    ],
  },
  {
    title: "Keuangan",
    items: [
      { label: "Kas RT", href: "/keuangan/kas", icon: Wallet, feature: Feature.KAS_RT },
      { label: "Iuran", href: "/keuangan/iuran", icon: Receipt, feature: Feature.IURAN_BULANAN },
      { label: "Laporan", href: "/keuangan/laporan", icon: BarChart3, feature: Feature.LAPORAN_CASHFLOW },
    ],
  },
  {
    title: "Komunitas",
    items: [
      { label: "Agenda", href: "/agenda", icon: Calendar, feature: Feature.AGENDA },
      { label: "Berita", href: "/berita", icon: Newspaper, feature: Feature.BERITA },
      { label: "Bansos", href: "/bansos", icon: HeartHandshake, feature: Feature.BANSOS },
      { label: "Siskamling", href: "/siskamling", icon: Shield, feature: Feature.SISKAMLING },
      { label: "Keluhan", href: "/keluhan", icon: MessageSquare, feature: Feature.KELUHAN },
    ],
  },
  {
    title: "Premium",
    items: [
      { label: "Usaha Warga", href: "/usaha-warga", icon: Store, feature: Feature.USAHA_WARGA },
      { label: "Pembangunan", href: "/pembangunan", icon: HardHat, feature: Feature.PEMBANGUNAN },
      { label: "Pos Security", href: "/pos-security", icon: ShieldCheck, feature: Feature.POS_SECURITY },
    ],
  },
  {
    title: "Pengaturan",
    items: [
      { label: "Pengaturan", href: "/pengaturan/profil", icon: Settings },
      { label: "Langganan", href: "/pengaturan/langganan", icon: CreditCard },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const tier = (session?.user?.tier as SubscriptionTier) ?? "TIER_A";

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            <span className="font-bold text-lg">RT Online</span>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tier badge */}
        <div className="px-4 py-3 border-b">
          <Badge
            variant={tier === "TIER_C" ? "default" : tier === "TIER_B" ? "secondary" : "outline"}
          >
            Paket {getTierLabel(tier)}
          </Badge>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const hasAccess = item.feature
                    ? canAccess(item.feature, tier)
                    : true;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={hasAccess ? item.href : "/pengaturan/langganan"}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : hasAccess
                          ? "text-gray-700 hover:bg-gray-100"
                          : "text-gray-400 hover:bg-gray-50"
                      )}
                      onClick={() => onClose()}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {!hasAccess && (
                        <Lock className="h-3 w-3 text-gray-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

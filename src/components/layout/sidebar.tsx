"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { canAccess, Feature, getTierLabel } from "@/lib/features";
import { getRoleLabel } from "@/lib/permissions";
import { SubscriptionTier, UserRole } from "@prisma/client";
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
  Server,
  Eye,
  FileBarChart,
  ClipboardList,
  Banknote,
  Inbox,
  ShoppingBag,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  feature?: Feature;
  roles?: UserRole[]; // If set, only these roles can see this item
}

interface NavSection {
  title: string;
  items: NavItem[];
  roles?: UserRole[]; // If set, only these roles can see this section
}

const navSections: NavSection[] = [
  {
    title: "Utama",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Pendataan",
    roles: [UserRole.SUPER_ADMIN, UserRole.RT_ADMIN, UserRole.RW_ADMIN],
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
    roles: [UserRole.SUPER_ADMIN, UserRole.RT_ADMIN, UserRole.RW_ADMIN],
    items: [
      { label: "Surat", href: "/surat", icon: FileText, feature: Feature.SURAT_KETERANGAN },
      { label: "Pengajuan", href: "/pengajuan", icon: Inbox },
      { label: "Organisasi", href: "/organisasi", icon: Building2, feature: Feature.STRUKTUR_ORGANISASI },
      { label: "Inventaris", href: "/inventaris", icon: Package, feature: Feature.BARANG_INVENTARIS },
    ],
  },
  {
    title: "Keuangan",
    roles: [UserRole.SUPER_ADMIN, UserRole.RT_ADMIN, UserRole.RW_ADMIN],
    items: [
      { label: "Kas RT", href: "/keuangan/kas", icon: Wallet, feature: Feature.KAS_RT },
      { label: "Iuran", href: "/keuangan/iuran", icon: Receipt, feature: Feature.IURAN_BULANAN },
      { label: "Laporan", href: "/keuangan/laporan", icon: BarChart3, feature: Feature.LAPORAN_CASHFLOW },
    ],
  },
  {
    title: "Komunitas",
    roles: [UserRole.SUPER_ADMIN, UserRole.RT_ADMIN, UserRole.RW_ADMIN],
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
    roles: [UserRole.SUPER_ADMIN, UserRole.RT_ADMIN],
    items: [
      { label: "Usaha Warga", href: "/usaha-warga", icon: Store, feature: Feature.USAHA_WARGA },
      { label: "Pembangunan", href: "/pembangunan", icon: HardHat, feature: Feature.PEMBANGUNAN },
      { label: "Pos Security", href: "/pos-security", icon: ShieldCheck, feature: Feature.POS_SECURITY },
    ],
  },
  // Layanan Digital — visible to all roles
  {
    title: "Layanan Digital",
    items: [
      { label: "Marketplace", href: "/marketplace", icon: ShoppingBag },
      {
        label: "PPOB",
        href: "/ppob",
        icon: Zap,
        roles: [UserRole.SUPER_ADMIN, UserRole.RT_ADMIN, UserRole.RESIDENT],
      },
    ],
  },
  // Warga-only section
  {
    title: "Layanan Saya",
    roles: [UserRole.RESIDENT],
    items: [
      { label: "Data Saya", href: "/profil-saya", icon: Users },
      { label: "Ajukan Surat", href: "/surat-saya", icon: FileText },
      { label: "Pengajuan", href: "/pengajuan", icon: Inbox },
      { label: "Iuran Saya", href: "/iuran-saya", icon: Receipt },
      { label: "Transparansi Keuangan", href: "/keuangan/transparansi", icon: BarChart3 },
      { label: "Keluhan", href: "/keluhan", icon: MessageSquare },
      { label: "Agenda", href: "/agenda", icon: Calendar },
      { label: "Berita", href: "/berita", icon: Newspaper },
    ],
  },
  // RW/Lurah oversight section
  {
    title: "Laporan & Pengawasan",
    roles: [UserRole.RW_ADMIN],
    items: [
      { label: "Rekap Warga", href: "/laporan/warga", icon: FileBarChart },
      { label: "Rekap Keuangan", href: "/laporan/keuangan", icon: BarChart3 },
      { label: "Persetujuan Surat", href: "/laporan/surat", icon: ClipboardList },
      { label: "Monitoring RT", href: "/laporan/monitoring", icon: Eye },
    ],
  },
  // Server admin section
  {
    title: "Server",
    roles: [UserRole.SUPER_ADMIN],
    items: [
      { label: "Kelola Tenant",          href: "/admin/tenants",       icon: Server },
      { label: "Semua User",             href: "/admin/users",          icon: Users },
      { label: "Langganan",              href: "/admin/subscriptions",  icon: CreditCard },
      { label: "Manajemen Pembayaran",   href: "/admin/payments",       icon: Banknote },
    ],
  },
  {
    title: "Pengaturan",
    roles: [UserRole.SUPER_ADMIN, UserRole.RT_ADMIN],
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
  const role = (session?.user?.role as UserRole) ?? "RESIDENT";

  // Filter sections based on role
  const visibleSections = navSections.filter((section) => {
    if (!section.roles) return true;
    return section.roles.includes(role);
  });

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
        <div className="h-14 lg:h-16 flex items-center justify-between px-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            <span className="font-bold text-lg">RT Online</span>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role & Tier badge */}
        <div className="px-4 py-3 border-b space-y-1">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                role === "SUPER_ADMIN" ? "destructive" :
                role === "RW_ADMIN" ? "default" :
                role === "RT_ADMIN" ? "secondary" : "outline"
              }
              className="text-xs"
            >
              {getRoleLabel(role)}
            </Badge>
          </div>
          {role === "SUPER_ADMIN" ? (
            <Badge variant="destructive" className="text-xs">
              Full Access (A, B, C)
            </Badge>
          ) : role === "RT_ADMIN" ? (
            <Badge
              variant={tier === "TIER_C" ? "default" : tier === "TIER_B" ? "secondary" : "outline"}
              className="text-xs"
            >
              Paket {getTierLabel(tier)}
            </Badge>
          ) : null}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {visibleSections.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  // Check role access for individual items
                  if (item.roles && !item.roles.includes(role)) return null;

                  const hasAccess = role === "SUPER_ADMIN"
                    ? true
                    : item.feature
                    ? canAccess(item.feature, tier)
                    : true;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                  return (
                    <Link
                      key={item.href}
                      href={hasAccess ? item.href : "/pengaturan/langganan"}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : hasAccess
                          ? "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          : "text-gray-400 hover:bg-gray-50"
                      )}
                      onClick={() => onClose()}
                    >
                      <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-primary-foreground" : "")} />
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

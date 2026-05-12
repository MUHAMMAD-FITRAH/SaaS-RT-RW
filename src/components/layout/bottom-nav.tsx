"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Wallet, Receipt,
  MessageSquare, User, Inbox, BarChart3,
  Server, Settings, Grid3x3,
  type LucideIcon,
} from "lucide-react";

interface BottomNavItem {
  label: string;
  href:  string;
  icon:  LucideIcon;
  /** If true, this item triggers the sidebar open instead of navigating */
  isMenu?: true;
}

const NAV_BY_ROLE: Record<string, BottomNavItem[]> = {
  RESIDENT: [
    { label: "Beranda",   href: "/dashboard",  icon: LayoutDashboard },
    { label: "Iuran",     href: "/iuran-saya", icon: Receipt },
    { label: "Pengajuan", href: "/pengajuan",   icon: Inbox },
    { label: "Keluhan",   href: "/keluhan",     icon: MessageSquare },
    { label: "Profil",    href: "/profil-saya", icon: User },
  ],
  RT_ADMIN: [
    { label: "Beranda",   href: "/dashboard",     icon: LayoutDashboard },
    { label: "Warga",     href: "/warga",          icon: Users },
    { label: "Kas",       href: "/keuangan/kas",   icon: Wallet },
    { label: "Iuran",     href: "/keuangan/iuran", icon: Receipt },
    { label: "Menu",      href: "#",               icon: Grid3x3, isMenu: true },
  ],
  RW_ADMIN: [
    { label: "Beranda",   href: "/dashboard",         icon: LayoutDashboard },
    { label: "Keuangan",  href: "/laporan/keuangan",  icon: BarChart3 },
    { label: "Monitoring",href: "/laporan/monitoring", icon: Settings },
    { label: "Surat",     href: "/laporan/surat",     icon: Inbox },
    { label: "Menu",      href: "#",                  icon: Grid3x3, isMenu: true },
  ],
  SUPER_ADMIN: [
    { label: "Beranda",   href: "/dashboard",           icon: LayoutDashboard },
    { label: "Tenant",    href: "/admin/tenants",        icon: Server },
    { label: "User",      href: "/admin/users",          icon: Users },
    { label: "Langganan", href: "/admin/subscriptions",  icon: Receipt },
    { label: "Menu",      href: "#",                    icon: Grid3x3, isMenu: true },
  ],
};

interface BottomNavProps {
  onMenuClick: () => void;
}

export function BottomNav({ onMenuClick }: BottomNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role  = (session?.user?.role as UserRole) ?? "RESIDENT";
  const items = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.RESIDENT;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t z-30"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-[60px]">
        {items.map(item => {
          if (item.isMenu) {
            return (
              <button
                key={item.label}
                onClick={onMenuClick}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <item.icon className="h-5 w-5 text-gray-400" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }

          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
            >
              {/* Active indicator bar at top */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-primary rounded-b-full" />
              )}

              {/* Icon with pill background when active */}
              <span className={cn(
                "flex items-center justify-center w-8 h-8 rounded-xl transition-colors",
                isActive ? "bg-primary/10" : "",
              )}>
                <item.icon className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  isActive ? "text-primary" : "text-gray-400",
                )} />
              </span>

              <span className={cn(
                "text-[10px] font-semibold leading-none transition-colors",
                isActive ? "text-primary" : "text-gray-500",
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

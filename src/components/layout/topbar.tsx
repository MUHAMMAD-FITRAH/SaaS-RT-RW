"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import { getRoleLabel } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ─── Page title map ──────────────────────────────────────────────────────────

const PAGE_TITLES: [string, string][] = [
  ["/keuangan/transparansi", "Transparansi Keuangan"],
  ["/keuangan/laporan",      "Laporan Keuangan"],
  ["/keuangan/iuran",        "Iuran"],
  ["/keuangan/kas",          "Kas RT"],
  ["/laporan/monitoring",    "Monitoring RT"],
  ["/laporan/keuangan",      "Rekap Keuangan"],
  ["/laporan/warga",         "Rekap Warga"],
  ["/laporan/surat",         "Persetujuan Surat"],
  ["/admin/subscriptions",   "Langganan"],
  ["/admin/payments",        "Manajemen Pembayaran"],
  ["/admin/tenants",         "Kelola Tenant"],
  ["/admin/users",           "Semua User"],
  ["/pengaturan/langganan",  "Langganan"],
  ["/pengaturan/profil",     "Pengaturan"],
  ["/usaha-warga",           "Usaha Warga"],
  ["/pos-security",          "Pos Security"],
  ["/profil-saya",           "Profil Saya"],
  ["/surat-saya",            "Ajukan Surat"],
  ["/iuran-saya",            "Iuran Saya"],
  ["/pembangunan",           "Pembangunan"],
  ["/marketplace",           "Marketplace"],
  ["/siskamling",            "Siskamling"],
  ["/organisasi",            "Organisasi"],
  ["/inventaris",            "Inventaris"],
  ["/pengajuan",             "Pengajuan"],
  ["/kendaraan",             "Kendaraan"],
  ["/keluarga",              "Data Keluarga"],
  ["/dashboard",             "Dashboard"],
  ["/keluhan",               "Keluhan"],
  ["/bansos",                "Bansos"],
  ["/agenda",                "Agenda"],
  ["/berita",                "Berita"],
  ["/warga",                 "Data Warga"],
  ["/rumah",                 "Data Rumah"],
  ["/tamu",                  "Tamu"],
  ["/surat",                 "Surat"],
  ["/ppob",                  "PPOB"],
];

function getPageTitle(pathname: string): string {
  for (const [path, title] of PAGE_TITLES) {
    if (pathname === path || pathname.startsWith(path + "/")) return title;
  }
  const seg = pathname.split("/").filter(Boolean).pop() ?? "";
  return seg ? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ") : "RT Online";
}

// ─── User dropdown ────────────────────────────────────────────────────────────

function UserMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary select-none">
          {getInitials(name || "U")}
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border z-20 overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="font-semibold text-sm truncate">{name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{role}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const role = getRoleLabel((session?.user?.role as UserRole) ?? "RESIDENT");

  return (
    <header className="h-14 lg:h-16 border-b bg-white flex items-center justify-between px-4 sticky top-0 z-30 gap-3">

      {/* ── Left side ── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — desktop shows to open sidebar on collapse, mobile always visible */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop: RT Online logo + welcome */}
        <div className="hidden lg:flex items-center gap-2 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">
            {session?.user?.name ? `Selamat datang, ${session.user.name}` : "RT Online"}
          </p>
        </div>

        {/* Mobile: page title */}
        <div className="lg:hidden min-w-0">
          <p className="font-semibold text-sm truncate">{pageTitle}</p>
        </div>
      </div>

      {/* ── Right side ── */}
      <div className="flex items-center gap-2 shrink-0">
        {session?.user && (
          <>
            {/* Desktop: name + role text */}
            <div className="hidden lg:block text-right mr-1">
              <p className="text-sm font-semibold leading-tight">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">{role}</p>
            </div>

            {/* Avatar dropdown (both mobile + desktop) */}
            <UserMenu name={session.user.name ?? "U"} role={role} />

            {/* Desktop-only logout shortcut */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Keluar"
              className="hidden lg:flex h-9 w-9 text-gray-500 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

import { UserRole } from "@prisma/client";

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  // 1. Admin Server (Back Office / Developer) - Full platform access
  SUPER_ADMIN: ["*"],

  // 2. Admin Back Office (RT / Pengelola) - Full RT management
  RT_ADMIN: [
    "tenant:read", "tenant:update",
    "warga:*", "rumah:*", "keluarga:*", "tamu:*", "kendaraan:*",
    "surat:*", "keuangan:*", "iuran:*",
    "agenda:*", "berita:*", "bansos:*", "siskamling:*",
    "keluhan:*", "inventaris:*", "organisasi:*",
    "user:manage", "subscription:manage",
  ],

  // 3. Admin Back Office (RW / Lurah) - Oversight across RTs, approvals, reports
  RW_ADMIN: [
    "tenant:read",
    "warga:read", "rumah:read", "keluarga:read",
    "tamu:read", "kendaraan:read",
    "surat:read", "surat:approve",
    "keuangan:read",
    "iuran:read",
    "agenda:read", "berita:read",
    "bansos:read", "bansos:approve",
    "siskamling:read",
    "keluhan:read", "keluhan:respond",
    "inventaris:read",
    "organisasi:read",
    "pembangunan:read", "pembangunan:approve",
    "laporan:*",
  ],

  // 4. User (Warga / Installer Apps) - Own data only
  RESIDENT: [
    "tenant:read",
    "warga:read:self",
    "surat:create:self", "surat:read:self",
    "iuran:read:self", "iuran:pay:self",
    "agenda:read", "berita:read",
    "keluhan:create", "keluhan:read:self",
  ],
};

export function hasPermission(
  userRole: UserRole,
  permission: string
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;
  if (permissions.includes("*")) return true;

  const [resource, action] = permission.split(":");

  return permissions.some((p) => {
    if (p === permission) return true;
    if (p === `${resource}:*`) return true;
    const [pResource, pAction] = p.split(":");
    if (pResource === resource && pAction === action) return true;
    return false;
  });
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    SUPER_ADMIN: "Admin Server",
    RT_ADMIN: "Admin RT",
    RW_ADMIN: "Admin RW/Lurah",
    RESIDENT: "Warga",
  };
  return labels[role];
}

export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    SUPER_ADMIN: "Back Office Developer - Kelola seluruh platform",
    RT_ADMIN: "Back Office RT/Pengelola - Kelola data & operasional RT",
    RW_ADMIN: "Back Office RW/Lurah - Pengawasan & persetujuan lintas RT",
    RESIDENT: "Warga/Pengguna - Akses data pribadi & layanan",
  };
  return descriptions[role];
}

// Define which sidebar sections each role can see
export const ROLE_MENU_ACCESS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ["Utama", "Pendataan", "Administrasi", "Keuangan", "Komunitas", "Premium", "Pengaturan", "Server"],
  RT_ADMIN: ["Utama", "Pendataan", "Administrasi", "Keuangan", "Komunitas", "Premium", "Pengaturan"],
  RW_ADMIN: ["Utama", "Pendataan", "Administrasi", "Keuangan", "Komunitas", "Laporan"],
  RESIDENT: ["Utama", "Layanan"],
};

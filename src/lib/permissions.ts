import { UserRole } from "@prisma/client";

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ["*"],
  RT_ADMIN: [
    "tenant:read", "tenant:update",
    "warga:*", "rumah:*", "keluarga:*", "tamu:*", "kendaraan:*",
    "surat:*", "keuangan:*", "iuran:*",
    "agenda:*", "berita:*", "bansos:*", "siskamling:*",
    "keluhan:*", "inventaris:*", "organisasi:*",
    "user:manage", "subscription:manage",
  ],
  RT_STAFF: [
    "tenant:read",
    "warga:read", "warga:create", "warga:update",
    "rumah:read", "keluarga:read", "tamu:*", "kendaraan:read",
    "surat:read", "surat:create",
    "keuangan:read", "keuangan:create",
    "iuran:read", "iuran:create",
    "agenda:read", "berita:read",
    "siskamling:*", "keluhan:read",
  ],
  RESIDENT: [
    "tenant:read",
    "warga:read:self",
    "surat:create:self", "surat:read:self",
    "iuran:read:self",
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
    SUPER_ADMIN: "Super Admin",
    RT_ADMIN: "Ketua RT",
    RT_STAFF: "Pengurus RT",
    RESIDENT: "Warga",
  };
  return labels[role];
}

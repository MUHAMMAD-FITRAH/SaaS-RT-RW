import { SubscriptionTier, UserRole } from "@prisma/client";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
  tier: SubscriptionTier;
}

export interface DashboardStats {
  totalWarga: number;
  totalRumah: number;
  totalKeluarga: number;
  totalTamu: number;
  wargaAktif: number;
  wargaPindah: number;
  wargaMeninggal: number;
  saldoKas: number;
  iuranTerbayar: number;
  iuranTunggakan: number;
  // Super Admin extra fields
  totalTenants?: number;
  activeTenants?: number;
  totalUsers?: number;
  totalSurat?: number;
  suratPending?: number;
  totalKeluhan?: number;
  keluhanPending?: number;
  tierBreakdown?: Record<string, number>;
  recentTenants?: Array<{
    id: string;
    name: string;
    slug: string;
    rtNumber: string;
    rwNumber: string;
    isActive: boolean;
    tier: string;
    status: string;
    userCount: number;
    wargaCount: number;
    createdAt: string;
  }>;
}

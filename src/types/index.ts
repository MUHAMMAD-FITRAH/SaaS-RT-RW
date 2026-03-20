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
}

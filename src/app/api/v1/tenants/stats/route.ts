import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, successResponse, handleApiError } from "@/server/middleware/api-utils";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const role = session.user.role as UserRole;

    // SUPER_ADMIN: cross-tenant aggregate stats (full platform overview)
    if (role === "SUPER_ADMIN") {
      const [
        totalTenants,
        activeTenants,
        totalUsers,
        totalWarga,
        wargaAktif,
        wargaPindah,
        wargaMeninggal,
        totalRumah,
        totalKeluarga,
        totalTamu,
        totalSurat,
        suratPending,
        totalKeluhan,
        keluhanPending,
        tierCounts,
      ] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.warga.count(),
        prisma.warga.count({ where: { statusAktif: "AKTIF" } }),
        prisma.warga.count({ where: { statusAktif: "PINDAH" } }),
        prisma.warga.count({ where: { statusAktif: "MENINGGAL" } }),
        prisma.rumah.count(),
        prisma.keluarga.count(),
        prisma.tamu.count(),
        prisma.surat.count(),
        prisma.surat.count({ where: { status: "DIAJUKAN" } }),
        prisma.keluhan.count(),
        prisma.keluhan.count({ where: { status: "BARU" } }),
        prisma.subscription.groupBy({
          by: ["tier"],
          _count: { tier: true },
        }),
      ]);

      // Kas aggregate across all tenants
      const kasTransactions = await prisma.kasTransaction.groupBy({
        by: ["jenis"],
        _sum: { jumlah: true },
      });
      const kasMasuk = kasTransactions.find((k) => k.jenis === "MASUK")?._sum.jumlah ?? 0;
      const kasKeluar = kasTransactions.find((k) => k.jenis === "KELUAR")?._sum.jumlah ?? 0;
      const saldoKas = Number(kasMasuk) - Number(kasKeluar);

      // Iuran aggregate across all tenants
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const iuranTerbayar = await prisma.iuranPayment.count({
        where: { tahun: currentYear, bulan: currentMonth, tanggalBayar: { not: null } },
      });
      const iuranTunggakan = await prisma.iuranPayment.count({
        where: { tahun: currentYear, bulan: currentMonth, tanggalBayar: null },
      });

      // Per-tier breakdown
      const tierBreakdown: Record<string, number> = {};
      for (const t of tierCounts) {
        tierBreakdown[t.tier] = t._count.tier;
      }

      // Recent tenants
      const recentTenants = await prisma.tenant.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          subscription: { select: { tier: true, status: true } },
          _count: { select: { users: true, warga: true } },
        },
      });

      return successResponse({
        // Platform stats
        totalTenants,
        activeTenants,
        totalUsers,
        // Aggregate warga stats
        totalWarga,
        wargaAktif,
        wargaPindah,
        wargaMeninggal,
        totalRumah,
        totalKeluarga,
        totalTamu,
        // Surat & keluhan
        totalSurat,
        suratPending,
        totalKeluhan,
        keluhanPending,
        // Keuangan aggregate
        saldoKas,
        iuranTerbayar,
        iuranTunggakan,
        // Subscription breakdown
        tierBreakdown,
        // Recent tenants
        recentTenants: recentTenants.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          rtNumber: t.rtNumber,
          rwNumber: t.rwNumber,
          isActive: t.isActive,
          tier: t.subscription?.tier ?? "NONE",
          status: t.subscription?.status ?? "INACTIVE",
          userCount: t._count.users,
          wargaCount: t._count.warga,
          createdAt: t.createdAt,
        })),
      });
    }

    // Non-SUPER_ADMIN: tenant-scoped stats
    if (!tenantId) return successResponse({});

    const [
      totalWarga,
      wargaAktif,
      wargaPindah,
      wargaMeninggal,
      totalRumah,
      totalKeluarga,
      totalTamu,
    ] = await Promise.all([
      prisma.warga.count({ where: { tenantId } }),
      prisma.warga.count({ where: { tenantId, statusAktif: "AKTIF" } }),
      prisma.warga.count({ where: { tenantId, statusAktif: "PINDAH" } }),
      prisma.warga.count({ where: { tenantId, statusAktif: "MENINGGAL" } }),
      prisma.rumah.count({ where: { tenantId } }),
      prisma.keluarga.count({ where: { tenantId } }),
      prisma.tamu.count({ where: { tenantId } }),
    ]);

    const kasTransactions = await prisma.kasTransaction.groupBy({
      by: ["jenis"],
      where: { tenantId },
      _sum: { jumlah: true },
    });

    const kasMasuk = kasTransactions.find((k) => k.jenis === "MASUK")?._sum.jumlah ?? 0;
    const kasKeluar = kasTransactions.find((k) => k.jenis === "KELUAR")?._sum.jumlah ?? 0;
    const saldoKas = Number(kasMasuk) - Number(kasKeluar);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const iuranTerbayar = await prisma.iuranPayment.count({
      where: { tenantId, tahun: currentYear, bulan: currentMonth, tanggalBayar: { not: null } },
    });

    const iuranTunggakan = await prisma.iuranPayment.count({
      where: { tenantId, tahun: currentYear, bulan: currentMonth, tanggalBayar: null },
    });

    return successResponse({
      totalWarga,
      wargaAktif,
      wargaPindah,
      wargaMeninggal,
      totalRumah,
      totalKeluarga,
      totalTamu,
      saldoKas,
      iuranTerbayar,
      iuranTunggakan,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

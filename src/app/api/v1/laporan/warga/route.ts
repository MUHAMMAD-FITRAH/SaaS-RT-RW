import prisma from "@/lib/db";
import { requireAuth, successResponse, errorResponse, handleApiError } from "@/server/middleware/api-utils";
import { UserRole } from "@prisma/client";
import { AuthError } from "@/server/middleware/api-utils";

export async function GET() {
  try {
    const session = await requireAuth();
    const role = session.user.role as UserRole;
    if (role !== "RW_ADMIN" && role !== "SUPER_ADMIN") {
      throw new AuthError("Forbidden", 403);
    }

    const tenantId = session.user.tenantId;
    if (!tenantId && session.user.role !== "SUPER_ADMIN") return errorResponse("Tenant tidak ditemukan", 400);

    const [
      totalWarga, wargaAktif, wargaPindah, wargaMeninggal,
      totalRumah, totalKeluarga,
      genderStats, agamaStats, pekerjaanStats,
    ] = await Promise.all([
      prisma.warga.count({ where: tenantId ? { tenantId } : {} }),
      prisma.warga.count({ where: { ...(tenantId ? { tenantId } : {}), statusAktif: "AKTIF" } }),
      prisma.warga.count({ where: { ...(tenantId ? { tenantId } : {}), statusAktif: "PINDAH" } }),
      prisma.warga.count({ where: { ...(tenantId ? { tenantId } : {}), statusAktif: "MENINGGAL" } }),
      prisma.rumah.count({ where: tenantId ? { tenantId } : {} }),
      prisma.keluarga.count({ where: tenantId ? { tenantId } : {} }),
      prisma.warga.groupBy({ by: ["jenisKelamin"], where: { ...(tenantId ? { tenantId } : {}), statusAktif: "AKTIF" }, _count: true }),
      prisma.warga.groupBy({ by: ["agama"], where: { ...(tenantId ? { tenantId } : {}), statusAktif: "AKTIF" }, _count: true }),
      prisma.warga.groupBy({ by: ["pekerjaan"], where: { ...(tenantId ? { tenantId } : {}), statusAktif: "AKTIF" }, _count: true }),
    ]);

    return successResponse({
      totalWarga, wargaAktif, wargaPindah, wargaMeninggal,
      totalRumah, totalKeluarga,
      genderStats: genderStats.map((g) => ({ label: g.jenisKelamin, count: g._count })),
      agamaStats: agamaStats.map((a) => ({ label: a.agama, count: a._count })),
      pekerjaanStats: pekerjaanStats
        .map((p) => ({ label: p.pekerjaan || "Tidak Diketahui", count: p._count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

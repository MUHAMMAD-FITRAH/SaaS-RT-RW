import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, successResponse, handleApiError } from "@/server/middleware/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
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

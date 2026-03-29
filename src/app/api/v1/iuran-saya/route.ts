import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, successResponse, errorResponse, handleApiError } from "@/server/middleware/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { warga: true },
    });
    if (!user?.warga) return errorResponse("Data warga belum terhubung", 400);

    const url = new URL(req.url);
    const tahun = parseInt(url.searchParams.get("tahun") || String(new Date().getFullYear()));

    const payments = await prisma.iuranPayment.findMany({
      where: { tenantId, wargaId: user.warga.id, tahun },
      include: { iuranType: true },
      orderBy: [{ bulan: "asc" }],
    });

    const iuranTypes = await prisma.iuranType.findMany({
      where: { tenantId, isActive: true },
    });

    // Calculate summary
    const totalTagihan = payments.length;
    const totalLunas = payments.filter((p) => p.tanggalBayar !== null).length;
    const totalTunggakan = totalTagihan - totalLunas;
    const totalBayar = payments
      .filter((p) => p.tanggalBayar !== null)
      .reduce((sum, p) => sum + Number(p.jumlah), 0);
    const totalHutang = payments
      .filter((p) => p.tanggalBayar === null)
      .reduce((sum, p) => sum + Number(p.jumlah), 0);

    return successResponse({
      tahun,
      summary: { totalTagihan, totalLunas, totalTunggakan, totalBayar, totalHutang },
      iuranTypes,
      payments: payments.map((p) => ({
        id: p.id,
        bulan: p.bulan,
        tahun: p.tahun,
        jumlah: Number(p.jumlah),
        tanggalBayar: p.tanggalBayar,
        metodeBayar: p.metodeBayar,
        iuranType: p.iuranType.nama,
        lunas: p.tanggalBayar !== null,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

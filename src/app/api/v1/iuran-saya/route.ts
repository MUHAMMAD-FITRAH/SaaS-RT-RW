import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, successResponse, errorResponse, handleApiError } from "@/server/middleware/api-utils";

const PERIOD_ORDER: Record<string, number[]> = {
  BULANAN: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  TAHUNAN: [1],
};

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId && session.user.role !== "SUPER_ADMIN") return errorResponse("Tenant tidak ditemukan", 400);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { warga: true },
    });
    if (!user?.warga) return errorResponse("Data warga belum terhubung ke akun ini", 400);
    const warga = user.warga;
    const effectiveTenantId = tenantId ?? warga.tenantId;

    const url = new URL(req.url);
    const tahun = parseInt(url.searchParams.get("tahun") || String(new Date().getFullYear()));

    const iuranTypes = await prisma.iuranType.findMany({
      where: { ...(tenantId ? { tenantId } : {}), isActive: true },
      select: { id: true, nama: true, jumlah: true, periode: true, deskripsi: true, isJumlahFleksibel: true },
    });

    const seedableTypes = iuranTypes.filter((type) => PERIOD_ORDER[type.periode]?.length);
    if (seedableTypes.length > 0) {
      const missingPayments = seedableTypes.flatMap((type) =>
        PERIOD_ORDER[type.periode].map((bulan) => ({
          tenantId,
          iuranTypeId: type.id,
          wargaId: warga.id,
          bulan,
          tahun,
          jumlah: type.jumlah,
          tanggalBayar: null,
          metodeBayar: null,
          buktiUrl: null,
          pencatat: null,
          catatan: null,
        }))
      );

      await prisma.iuranPayment.createMany({
        data: missingPayments.map((payment) => ({ ...payment, tenantId: effectiveTenantId })),
        skipDuplicates: true,
      });
    }

    const payments = await prisma.iuranPayment.findMany({
      where: { ...(tenantId ? { tenantId } : {}), wargaId: warga.id, tahun },
      include: { iuranType: { select: { id: true, nama: true, periode: true, isJumlahFleksibel: true } } },
      orderBy: [{ tahun: "desc" }, { bulan: "asc" }],
    });

    const today = new Date();
    const currentPeriodKey = today.getFullYear() * 100 + (today.getMonth() + 1);

    const paymentsMapped = payments.map((p) => {
      const periodKey = p.tahun * 100 + p.bulan;
      let status: "LUNAS" | "MENUNGGU_KONFIRMASI" | "BELUM_BAYAR" | "TERSEDIA";
      if (p.tanggalBayar) status = "LUNAS";
      else if (p.buktiUrl) status = "MENUNGGU_KONFIRMASI";
      else if (periodKey > currentPeriodKey) status = "TERSEDIA";
      else status = "BELUM_BAYAR";

      return {
        id: p.id,
        bulan: p.bulan,
        tahun: p.tahun,
        jumlah: Number(p.jumlah),
        tanggalBayar: p.tanggalBayar,
        metodeBayar: p.metodeBayar,
        buktiUrl: p.buktiUrl,
        catatan: p.catatan,
        iuranType: p.iuranType.nama,
        iuranTypeId: p.iuranType.id,
        periode: p.iuranType.periode,
        isJumlahFleksibel: p.iuranType.isJumlahFleksibel,
        lunas: !!p.tanggalBayar,
        status,
      };
    });

    const totalTagihan = paymentsMapped.length;
    const totalLunas = paymentsMapped.filter((p) => p.status === "LUNAS").length;
    const totalMenunggu = paymentsMapped.filter((p) => p.status === "MENUNGGU_KONFIRMASI").length;
    const totalTunggakan = paymentsMapped.filter((p) => p.status === "BELUM_BAYAR").length;
    const totalAkanDatang = paymentsMapped.filter((p) => p.status === "TERSEDIA").length;
    const totalBayar = paymentsMapped.filter((p) => p.status === "LUNAS").reduce((s, p) => s + p.jumlah, 0);
    const totalHutang = paymentsMapped.filter((p) => p.status === "BELUM_BAYAR").reduce((s, p) => s + p.jumlah, 0);
    const totalBisaDibayar = paymentsMapped
      .filter((p) => p.status === "BELUM_BAYAR" || p.status === "TERSEDIA")
      .reduce((s, p) => s + p.jumlah, 0);

    return successResponse({
      tahun,
      warga: { id: warga.id, namaLengkap: warga.namaLengkap },
      summary: { totalTagihan, totalLunas, totalMenunggu, totalTunggakan, totalAkanDatang, totalBayar, totalHutang, totalBisaDibayar },
      iuranTypes: iuranTypes.map((t) => ({ ...t, jumlah: Number(t.jumlah) })),
      payments: paymentsMapped,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/iuran-saya
 * Warga uploads bukti transfer for an existing payment
 * Body: { paymentId, buktiUrl }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { warga: true },
    });
    if (!user?.warga) return errorResponse("Data warga belum terhubung ke akun ini", 400);

    const body = await req.json();
    const { paymentId, buktiUrl } = body;

    if (!paymentId || !buktiUrl) return errorResponse("paymentId dan buktiUrl wajib diisi", 422);

    // Verify payment belongs to this warga
    const payment = await prisma.iuranPayment.findFirst({
      where: {
        id: paymentId,
        wargaId: user.warga.id,
        ...(tenantId ? { tenantId } : {}),
      },
    });
    if (!payment) return errorResponse("Pembayaran tidak ditemukan", 404);
    if (payment.tanggalBayar) return errorResponse("Pembayaran ini sudah dikonfirmasi lunas", 409);

    const updated = await prisma.iuranPayment.update({
      where: { id: paymentId },
      data: { buktiUrl },
    });

    return successResponse({ ...updated, jumlah: Number(updated.jumlah) });
  } catch (error) {
    return handleApiError(error);
  }
}

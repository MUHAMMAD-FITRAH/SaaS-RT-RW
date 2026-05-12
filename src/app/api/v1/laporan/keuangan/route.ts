import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, successResponse, errorResponse, handleApiError, AuthError } from "@/server/middleware/api-utils";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const role = session.user.role as UserRole;
    if (role !== "RW_ADMIN" && role !== "SUPER_ADMIN" && role !== "RT_ADMIN") {
      throw new AuthError("Forbidden", 403);
    }

    const tenantId = session.user.tenantId;
    if (!tenantId && session.user.role !== "SUPER_ADMIN") return errorResponse("Tenant tidak ditemukan", 400);

    const url = new URL(req.url);
    const tahun = parseInt(url.searchParams.get("tahun") || String(new Date().getFullYear()));

    // Kas summary
    const kasTransactions = await prisma.kasTransaction.findMany({
      where: { ...(tenantId ? { tenantId } : {}), tanggal: { gte: new Date(tahun, 0, 1), lt: new Date(tahun + 1, 0, 1) } },
      orderBy: { tanggal: "desc" },
    });

    const totalMasuk = kasTransactions.filter((k) => k.jenis === "MASUK").reduce((sum, k) => sum + Number(k.jumlah), 0);
    const totalKeluar = kasTransactions.filter((k) => k.jenis === "KELUAR").reduce((sum, k) => sum + Number(k.jumlah), 0);

    // Iuran summary per month
    const iuranPayments = await prisma.iuranPayment.findMany({
      where: { ...(tenantId ? { tenantId } : {}), tahun },
      include: { iuranType: true },
    });

    const monthlyIuran = Array.from({ length: 12 }, (_, i) => {
      const bulan = i + 1;
      const monthPayments = iuranPayments.filter((p) => p.bulan === bulan);
      const lunas = monthPayments.filter((p) => p.tanggalBayar !== null);
      return {
        bulan,
        totalTagihan: monthPayments.length,
        totalLunas: lunas.length,
        totalTunggakan: monthPayments.length - lunas.length,
        jumlahTerbayar: lunas.reduce((sum, p) => sum + Number(p.jumlah), 0),
        jumlahTunggakan: monthPayments.filter((p) => !p.tanggalBayar).reduce((sum, p) => sum + Number(p.jumlah), 0),
      };
    });

    // Kas by category
    const kasByCategory: Record<string, { masuk: number; keluar: number }> = {};
    for (const tx of kasTransactions) {
      if (!kasByCategory[tx.kategori]) kasByCategory[tx.kategori] = { masuk: 0, keluar: 0 };
      if (tx.jenis === "MASUK") kasByCategory[tx.kategori].masuk += Number(tx.jumlah);
      else kasByCategory[tx.kategori].keluar += Number(tx.jumlah);
    }

    return successResponse({
      tahun,
      kas: {
        totalMasuk,
        totalKeluar,
        saldo: totalMasuk - totalKeluar,
        byCategory: Object.entries(kasByCategory).map(([kategori, val]) => ({ kategori, ...val })),
        recentTransactions: kasTransactions.slice(0, 10).map((k) => ({
          id: k.id, tanggal: k.tanggal, jenis: k.jenis,
          kategori: k.kategori, keterangan: k.keterangan, jumlah: Number(k.jumlah),
        })),
      },
      iuran: { monthlyIuran },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

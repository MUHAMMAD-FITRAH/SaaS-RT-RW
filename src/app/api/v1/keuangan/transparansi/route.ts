import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, successResponse, errorResponse, handleApiError } from "@/server/middleware/api-utils";

/**
 * GET /api/v1/keuangan/transparansi
 * Public cashflow summary accessible to all logged-in users in the tenant.
 * Warga can see aggregated kas + iuran collection stats (no individual details).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId && session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Tenant tidak ditemukan", 400);
    }

    const url = new URL(req.url);
    const tahun = parseInt(url.searchParams.get("tahun") || String(new Date().getFullYear()));

    const where = tenantId ? { tenantId } : {};
    const dateWhere = { gte: new Date(tahun, 0, 1), lt: new Date(tahun + 1, 0, 1) };

    // Kas transactions for the year
    const kasTransactions = await prisma.kasTransaction.findMany({
      where: { ...where, tanggal: dateWhere },
      select: {
        id: true,
        tanggal: true,
        jenis: true,
        kategori: true,
        keterangan: true,
        jumlah: true,
      },
      orderBy: { tanggal: "desc" },
    });

    const totalMasuk = kasTransactions
      .filter((k) => k.jenis === "MASUK")
      .reduce((s, k) => s + Number(k.jumlah), 0);
    const totalKeluar = kasTransactions
      .filter((k) => k.jenis === "KELUAR")
      .reduce((s, k) => s + Number(k.jumlah), 0);

    // Iuran collection summary (no individual names for privacy)
    const iuranPayments = await prisma.iuranPayment.findMany({
      where: { ...where, tahun },
      include: { iuranType: { select: { nama: true, periode: true } } },
    });

    const iuranTypes = await prisma.iuranType.findMany({
      where: { ...where, isActive: true },
      select: { id: true, nama: true, jumlah: true, periode: true, deskripsi: true },
    });

    // Monthly iuran collection
    const monthlyCollection = Array.from({ length: 12 }, (_, i) => {
      const bulan = i + 1;
      const monthPayments = iuranPayments.filter((p) => p.bulan === bulan);
      return {
        bulan,
        totalTagihan: monthPayments.length,
        totalLunas: monthPayments.filter((p) => p.tanggalBayar).length,
        jumlahTerkumpul: monthPayments
          .filter((p) => p.tanggalBayar)
          .reduce((s, p) => s + Number(p.jumlah), 0),
      };
    });

    // Iuran by type
    const iuranByType = iuranTypes.map((t) => {
      const typePayments = iuranPayments.filter((p) => p.iuranType.nama === t.nama);
      return {
        nama: t.nama,
        periode: t.periode,
        deskripsi: t.deskripsi,
        targetJumlah: Number(t.jumlah),
        totalTagihan: typePayments.length,
        totalLunas: typePayments.filter((p) => p.tanggalBayar).length,
        jumlahTerkumpul: typePayments
          .filter((p) => p.tanggalBayar)
          .reduce((s, p) => s + Number(p.jumlah), 0),
      };
    });

    // Kas by category for transparency
    const kasByCategory: Record<string, { masuk: number; keluar: number; count: number }> = {};
    for (const tx of kasTransactions) {
      if (!kasByCategory[tx.kategori]) kasByCategory[tx.kategori] = { masuk: 0, keluar: 0, count: 0 };
      if (tx.jenis === "MASUK") kasByCategory[tx.kategori].masuk += Number(tx.jumlah);
      else kasByCategory[tx.kategori].keluar += Number(tx.jumlah);
      kasByCategory[tx.kategori].count++;
    }

    // Monthly cashflow for chart
    const monthlyKas = Array.from({ length: 12 }, (_, i) => {
      const bulan = i + 1;
      const monthTx = kasTransactions.filter(
        (k) => new Date(k.tanggal).getMonth() + 1 === bulan
      );
      return {
        bulan,
        masuk: monthTx.filter((k) => k.jenis === "MASUK").reduce((s, k) => s + Number(k.jumlah), 0),
        keluar: monthTx.filter((k) => k.jenis === "KELUAR").reduce((s, k) => s + Number(k.jumlah), 0),
      };
    });

    // All transactions for the year (with id for client-side detail)
    const allKas = kasTransactions.map((k) => ({
      id:         k.id,
      tanggal:    k.tanggal,
      jenis:      k.jenis,
      kategori:   k.kategori,
      keterangan: k.keterangan,
      jumlah:     Number(k.jumlah),
    }));

    return successResponse({
      tahun,
      kas: {
        totalMasuk,
        totalKeluar,
        saldo: totalMasuk - totalKeluar,
        byCategory: Object.entries(kasByCategory).map(([kategori, v]) => ({ kategori, ...v })),
        monthlyKas,
        allTransactions: allKas,
      },
      iuran: {
        byType: iuranByType,
        monthly: monthlyCollection,
        totalTerkumpul: iuranPayments
          .filter((p) => p.tanggalBayar)
          .reduce((s, p) => s + Number(p.jumlah), 0),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, successResponse, errorResponse, handleApiError } from "@/server/middleware/api-utils";

/**
 * GET /api/v1/dashboard/resident
 * Aggregated data for the resident dashboard view.
 * Returns: myIuran, keluhanAktif, agendaMingguIni, iuranProgress,
 *          monthlyKas (3 months), recentKas, upcomingAgenda, rtInfo
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth();
    const { tenantId, id: userId } = session.user;

    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const now = new Date();
    const bulanIni = now.getMonth() + 1;
    const tahunIni = now.getFullYear();

    // ── Find this warga ──────────────────────────────────────────────────────
    const warga = await prisma.warga.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    });

    // ── 1. My iuran status this month ─────────────────────────────────────────
    let myIuran: {
      status: string;
      jumlah: number;
      bulan: number;
      tahun: number;
      nama: string;
    } | null = null;

    if (warga) {
      const myPayment = await prisma.iuranPayment.findFirst({
        where: {
          tenantId,
          wargaId: warga.id,
          bulan: bulanIni,
          tahun: tahunIni,
        },
        include: { iuranType: { select: { nama: true } } },
        orderBy: { createdAt: "desc" },
      });

      if (myPayment) {
        myIuran = {
          status: myPayment.tanggalBayar ? "LUNAS" : "BELUM_BAYAR",
          jumlah: Number(myPayment.jumlah),
          bulan:  myPayment.bulan,
          tahun:  myPayment.tahun,
          nama:   myPayment.iuranType.nama,
        };
      }
    }

    // ── 2. Keluhan aktif (by this warga, not SELESAI/DITOLAK) ────────────────
    const keluhanAktif = warga
      ? await prisma.keluhan.count({
          where: {
            tenantId,
            wargaId: warga.id,
            status: { notIn: ["SELESAI", "DITOLAK"] },
          },
        })
      : 0;

    // ── 3. Agenda dalam 30 hari ke depan ────────────────────────────────────
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const agendaMingguIni = await prisma.agenda.count({
      where: {
        tenantId,
        isPublished: true,
        tanggalMulai: { gte: now, lt: thirtyDaysLater },
      },
    });

    // ── 4. RT-wide iuran progress ─────────────────────────────────────────────
    // Use current month if it has any lunas; otherwise fall back to the most
    // recent billing month that has at least one lunas payment.
    let billingBulan = bulanIni;
    let billingTahun = tahunIni;

    const currentMonthHasLunas = await prisma.iuranPayment.count({
      where: { tenantId, bulan: bulanIni, tahun: tahunIni, tanggalBayar: { not: null } },
    });

    if (currentMonthHasLunas === 0) {
      // Find the most recent month with at least one paid record
      const latestPaid = await prisma.iuranPayment.findFirst({
        where: { tenantId, tanggalBayar: { not: null } },
        orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
        select: { bulan: true, tahun: true },
      });
      if (latestPaid) {
        billingBulan = latestPaid.bulan;
        billingTahun = latestPaid.tahun;
      }
    }

    const allIuranBilling = await prisma.iuranPayment.findMany({
      where: { tenantId, bulan: billingBulan, tahun: billingTahun },
      select: { tanggalBayar: true, jumlah: true },
    });
    const totalTagihan   = allIuranBilling.length;
    const totalLunas     = allIuranBilling.filter((p) => p.tanggalBayar).length;
    const totalTerkumpul = allIuranBilling
      .filter((p) => p.tanggalBayar)
      .reduce((s, p) => s + Number(p.jumlah), 0);
    const totalTarget    = allIuranBilling.reduce((s, p) => s + Number(p.jumlah), 0);
    const iuranPct       = totalTagihan > 0 ? Math.round((totalLunas / totalTagihan) * 100) : 0;

    const iuranProgress = {
      pct: iuranPct, totalTerkumpul, totalTarget, totalLunas, totalTagihan,
      bulan: billingBulan, tahun: billingTahun,
    };

    // ── 5. Monthly kas — last 3 months ───────────────────────────────────────
    const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const monthlyKas: { bulan: number; tahun: number; label: string; masuk: number; keluar: number }[] = [];

    for (let i = 2; i >= 0; i--) {
      const d = new Date(tahunIni, bulanIni - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const start = new Date(y, m - 1, 1);
      const end   = new Date(y, m, 1);

      const txs = await prisma.kasTransaction.findMany({
        where: { tenantId, tanggal: { gte: start, lt: end } },
        select: { jenis: true, jumlah: true },
      });
      monthlyKas.push({
        bulan:  m,
        tahun:  y,
        label:  MONTHS_ID[m - 1],
        masuk:  txs.filter((t) => t.jenis === "MASUK").reduce((s, t) => s + Number(t.jumlah), 0),
        keluar: txs.filter((t) => t.jenis === "KELUAR").reduce((s, t) => s + Number(t.jumlah), 0),
      });
    }

    // ── 6. Recent kas transactions (last 5) ───────────────────────────────────
    const recentKasRaw = await prisma.kasTransaction.findMany({
      where:   { tenantId },
      orderBy: { tanggal: "desc" },
      take:    5,
      select:  { id: true, tanggal: true, jenis: true, kategori: true, keterangan: true, jumlah: true },
    });
    const recentKas = recentKasRaw.map((k) => ({
      id:         k.id,
      tanggal:    k.tanggal,
      jenis:      k.jenis,
      kategori:   k.kategori,
      keterangan: k.keterangan,
      jumlah:     Number(k.jumlah),
    }));

    // ── 7. Upcoming agenda (next 3, or recent past 7 days if none future) ───────
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const upcomingAgendaRaw = await prisma.agenda.findMany({
      where:   { tenantId, isPublished: true, tanggalMulai: { gte: sevenDaysAgo } },
      orderBy: { tanggalMulai: "asc" },
      take:    3,
      select:  { id: true, judul: true, tanggalMulai: true, lokasi: true },
    });
    const upcomingAgenda = upcomingAgendaRaw.map((a) => ({
      id:           a.id,
      judul:        a.judul,
      tanggalMulai: a.tanggalMulai,
      lokasi:       a.lokasi,
    }));

    // ── 8. RT Info ────────────────────────────────────────────────────────────
    const [totalWarga, totalRumah] = await Promise.all([
      prisma.warga.count({ where: { tenantId, statusAktif: "AKTIF" } }),
      prisma.rumah.count({ where: { tenantId } }),
    ]);

    return successResponse({
      myIuran,
      keluhanAktif,
      agendaMingguIni,
      iuranProgress,
      monthlyKas,
      recentKas,
      upcomingAgenda,
      rtInfo: { totalWarga, totalRumah },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

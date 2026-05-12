import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
  paginatedResponse,
  resolveTenantId,
} from "@/server/middleware/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId && session.user.role !== "SUPER_ADMIN") return errorResponse("Tenant not found", 400);

    const { page, limit, skip, search } = getPaginationParams(req);
    const url = new URL(req.url);
    const now = new Date();
    const bulan = parseInt(url.searchParams.get("bulan") || String(now.getMonth() + 1));
    const tahun = parseInt(url.searchParams.get("tahun") || String(now.getFullYear()));

    const iuranTypes = await prisma.iuranType.findMany({
      where: { ...(tenantId ? { tenantId } : {}), isActive: true },
      orderBy: { createdAt: "desc" },
    });

    const paymentWhere: Record<string, unknown> = {
      ...(tenantId ? { tenantId } : {}),
      bulan,
      tahun,
    };
    if (search) {
      paymentWhere.warga = {
        namaLengkap: { contains: search, mode: "insensitive" },
      };
    }

    const [payments, totalPayments] = await Promise.all([
      prisma.iuranPayment.findMany({
        where: paymentWhere,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          warga: { select: { id: true, namaLengkap: true } },
          iuranType: { select: { id: true, nama: true } },
        },
      }),
      prisma.iuranPayment.count({ where: paymentWhere }),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          iuranTypes: iuranTypes.map((t) => ({
          ...t,
          jumlah: Number(t.jumlah),
          deskripsi: t.deskripsi,
          isJumlahFleksibel: t.isJumlahFleksibel,
        })),
          payments: payments.map((p) => ({
            ...p,
            jumlah: Number(p.jumlah),
            buktiUrl: p.buktiUrl,
            catatan: p.catatan,
          })),
        },
        meta: {
          page,
          limit,
          total: totalPayments,
          totalPages: Math.ceil(totalPayments / limit),
          bulan,
          tahun,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const tenantId = await resolveTenantId(session, body.tenantId);
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const { action } = body;

    if (action === "create_type") {
      const { nama, jumlah, periode, deskripsi, isJumlahFleksibel } = body;
      if (!nama) return errorResponse("Nama iuran wajib diisi", 422);
      if (!isJumlahFleksibel && (!jumlah || Number(jumlah) <= 0))
        return errorResponse("Jumlah harus lebih dari 0 untuk iuran non-donasi", 422);

      const existing = await prisma.iuranType.findUnique({
        where: { tenantId_nama: { tenantId, nama } },
      });
      if (existing) return errorResponse("Nama iuran sudah ada", 409);

      const iuranType = await prisma.iuranType.create({
        data: {
          tenantId,
          nama,
          jumlah: isJumlahFleksibel ? 0 : jumlah,
          periode: periode || "BULANAN",
          deskripsi: deskripsi || null,
          isJumlahFleksibel: !!isJumlahFleksibel,
        },
      });

      return successResponse({ ...iuranType, jumlah: Number(iuranType.jumlah) }, 201);
    }

    if (action === "record_payment") {
      const { iuranTypeId, wargaId, bulan, tahun, jumlah, metodeBayar, buktiUrl, catatan } = body;
      if (!iuranTypeId || !wargaId || !jumlah) {
        return errorResponse("iuranTypeId, wargaId, dan jumlah wajib diisi", 422);
      }

      const iuranType = await prisma.iuranType.findFirst({
        where: { id: iuranTypeId, ...(tenantId ? { tenantId } : {}) },
      });
      if (!iuranType) return errorResponse("Jenis iuran tidak ditemukan", 404);

      // For BULANAN/TAHUNAN/INSIDENTAL, bulan & tahun required
      const needsMonth = iuranType.periode !== "DONASI";
      if (needsMonth && (!bulan || !tahun)) {
        return errorResponse("Bulan dan tahun wajib diisi", 422);
      }

      const bulanNum = needsMonth ? Number(bulan) : new Date().getMonth() + 1;
      const tahunNum = needsMonth ? Number(tahun) : new Date().getFullYear();

      const existing = await prisma.iuranPayment.findUnique({
        where: {
          tenantId_iuranTypeId_wargaId_bulan_tahun: {
            tenantId,
            iuranTypeId,
            wargaId,
            bulan: bulanNum,
            tahun: tahunNum,
          },
        },
      });
      if (existing) return errorResponse("Pembayaran untuk warga ini sudah ada", 409);

      const payment = await prisma.iuranPayment.create({
        data: {
          tenantId,
          iuranTypeId,
          wargaId,
          bulan: bulanNum,
          tahun: tahunNum,
          jumlah,
          tanggalBayar: new Date(),
          metodeBayar: metodeBayar || null,
          buktiUrl: buktiUrl || null,
          catatan: catatan || null,
          pencatat: session.user.name,
        },
        include: {
          warga: { select: { namaLengkap: true } },
          iuranType: { select: { nama: true } },
        },
      });

      return successResponse({ ...payment, jumlah: Number(payment.jumlah) }, 201);
    }

    if (action === "generate") {
      // Also fix: frontend was sending `jenisIuranId` but should be `iuranTypeId`
      const iuranTypeId = body.iuranTypeId || body.jenisIuranId;
      const { bulan, tahun } = body;
      if (!iuranTypeId || !bulan || !tahun) {
        return errorResponse("iuranTypeId, bulan, dan tahun wajib diisi", 422);
      }

      const iuranType = await prisma.iuranType.findFirst({
        where: { id: iuranTypeId, ...(tenantId ? { tenantId } : {}), isActive: true },
      });
      if (!iuranType) {
        return errorResponse("Jenis iuran tidak ditemukan", 404);
      }

      const activeWarga = await prisma.warga.findMany({
        where: { ...(tenantId ? { tenantId } : {}), statusAktif: "AKTIF" },
        select: { id: true },
      });

      const existingPayments = await prisma.iuranPayment.findMany({
        where: {
          ...(tenantId ? { tenantId } : {}),
          iuranTypeId,
          bulan: Number(bulan),
          tahun: Number(tahun),
        },
        select: { wargaId: true },
      });
      const existingWargaIds = new Set(existingPayments.map((p) => p.wargaId));

      const newPayments = activeWarga
        .filter((w) => !existingWargaIds.has(w.id))
        .map((w) => ({
          tenantId,
          iuranTypeId,
          wargaId: w.id,
          bulan: Number(bulan),
          tahun: Number(tahun),
          jumlah: iuranType.jumlah,
          tanggalBayar: null,
          metodeBayar: null,
          pencatat: null,
        }));

      if (newPayments.length === 0) {
        return errorResponse("Semua warga aktif sudah memiliki tagihan untuk bulan/tahun ini", 409);
      }

      await prisma.iuranPayment.createMany({ data: newPayments });

      return successResponse({ message: `${newPayments.length} tagihan berhasil di-generate` }, 201);
    }

    return errorResponse("Action tidak valid. Gunakan 'create_type', 'record_payment', atau 'generate'", 400);
  } catch (error) {
    return handleApiError(error);
  }
}

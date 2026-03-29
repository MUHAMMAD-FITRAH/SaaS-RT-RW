import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
  paginatedResponse,
} from "@/server/middleware/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const { page, limit, skip, search } = getPaginationParams(req);
    const url = new URL(req.url);
    const now = new Date();
    const bulan = parseInt(url.searchParams.get("bulan") || String(now.getMonth() + 1));
    const tahun = parseInt(url.searchParams.get("tahun") || String(now.getFullYear()));

    const iuranTypes = await prisma.iuranType.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    const paymentWhere: Record<string, unknown> = {
      tenantId,
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
          iuranTypes: iuranTypes.map((t) => ({ ...t, jumlah: Number(t.jumlah) })),
          payments: payments.map((p) => ({
            ...p,
            jumlah: Number(p.jumlah),
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
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const body = await req.json();
    const { action } = body;

    if (action === "create_type") {
      const { nama, jumlah, periode } = body;
      if (!nama || !jumlah) {
        return errorResponse("Nama dan jumlah wajib diisi", 422);
      }
      if (Number(jumlah) <= 0) {
        return errorResponse("Jumlah harus lebih dari 0", 422);
      }

      const existing = await prisma.iuranType.findUnique({
        where: { tenantId_nama: { tenantId, nama } },
      });
      if (existing) {
        return errorResponse("Nama iuran sudah ada", 409);
      }

      const iuranType = await prisma.iuranType.create({
        data: {
          tenantId,
          nama,
          jumlah,
          periode: periode || "BULANAN",
        },
      });

      return successResponse({ ...iuranType, jumlah: Number(iuranType.jumlah) }, 201);
    }

    if (action === "record_payment") {
      const { iuranTypeId, wargaId, bulan, tahun, jumlah, metodeBayar } = body;
      if (!iuranTypeId || !wargaId || !bulan || !tahun || !jumlah) {
        return errorResponse("iuranTypeId, wargaId, bulan, tahun, dan jumlah wajib diisi", 422);
      }

      const existing = await prisma.iuranPayment.findUnique({
        where: {
          tenantId_iuranTypeId_wargaId_bulan_tahun: {
            tenantId,
            iuranTypeId,
            wargaId,
            bulan: Number(bulan),
            tahun: Number(tahun),
          },
        },
      });
      if (existing) {
        return errorResponse("Pembayaran untuk warga ini pada bulan/tahun tersebut sudah ada", 409);
      }

      const payment = await prisma.iuranPayment.create({
        data: {
          tenantId,
          iuranTypeId,
          wargaId,
          bulan: Number(bulan),
          tahun: Number(tahun),
          jumlah,
          tanggalBayar: new Date(),
          metodeBayar: metodeBayar || null,
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
      const { iuranTypeId, bulan, tahun } = body;
      if (!iuranTypeId || !bulan || !tahun) {
        return errorResponse("iuranTypeId, bulan, dan tahun wajib diisi", 422);
      }

      const iuranType = await prisma.iuranType.findFirst({
        where: { id: iuranTypeId, tenantId, isActive: true },
      });
      if (!iuranType) {
        return errorResponse("Jenis iuran tidak ditemukan", 404);
      }

      const activeWarga = await prisma.warga.findMany({
        where: { tenantId, statusAktif: "AKTIF" },
        select: { id: true },
      });

      const existingPayments = await prisma.iuranPayment.findMany({
        where: {
          tenantId,
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

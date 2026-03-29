import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireFeature,
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
  paginatedResponse,
} from "@/server/middleware/api-utils";
import { Feature } from "@/lib/features";

export async function GET(req: NextRequest) {
  try {
    const session = await requireFeature(Feature.POS_SECURITY);
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const { page, limit, skip, search } = getPaginationParams(req);
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const where: Record<string, unknown> = { tenantId };

    if (from || to) {
      const tanggalFilter: Record<string, unknown> = {};
      if (from) tanggalFilter.gte = new Date(from);
      if (to) tanggalFilter.lte = new Date(to + "T23:59:59.999Z");
      where.tanggal = tanggalFilter;
    }

    if (search) {
      where.OR = [
        { petugas: { contains: search, mode: "insensitive" } },
        { kejadian: { contains: search, mode: "insensitive" } },
        { catatan: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.posSecurityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tanggal: "desc" },
      }),
      prisma.posSecurityLog.count({ where }),
    ]);

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireFeature(Feature.POS_SECURITY);
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const body = await req.json();
    const {
      tanggal,
      petugas,
      shift,
      kejadian,
      tamuMasuk,
      tamuKeluar,
      kendaraanMasuk,
      kendaraanKeluar,
      catatan,
    } = body;

    if (!petugas) {
      return errorResponse("Petugas wajib diisi", 422);
    }

    const log = await prisma.posSecurityLog.create({
      data: {
        tenantId,
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        petugas,
        shift: shift || null,
        kejadian: kejadian || null,
        tamuMasuk: Number(tamuMasuk) || 0,
        tamuKeluar: Number(tamuKeluar) || 0,
        kendaraanMasuk: Number(kendaraanMasuk) || 0,
        kendaraanKeluar: Number(kendaraanKeluar) || 0,
        catatan: catatan || null,
      },
    });

    return successResponse(log, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireFeature(Feature.POS_SECURITY);
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return errorResponse("ID log harus diisi", 400);

    const deleted = await prisma.posSecurityLog.deleteMany({
      where: { id, tenantId },
    });

    if (deleted.count === 0) return errorResponse("Log tidak ditemukan", 404);

    return successResponse({ message: "Log berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

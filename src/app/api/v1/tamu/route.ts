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
    if (!tenantId && session.user.role !== "SUPER_ADMIN") return errorResponse("Tenant tidak ditemukan", 400);

    const { page, limit, skip, search } = getPaginationParams(req);
    const url = new URL(req.url);
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    const where: Record<string, unknown> = tenantId ? { tenantId } : {};

    if (search) {
      where.OR = [
        { namaLengkap: { contains: search, mode: "insensitive" } },
        { wargaDikunjungi: { contains: search, mode: "insensitive" } },
      ];
    }

    if (dateFrom || dateTo) {
      const waktuFilter: Record<string, unknown> = {};
      if (dateFrom) waktuFilter.gte = new Date(dateFrom);
      if (dateTo) waktuFilter.lte = new Date(dateTo + "T23:59:59.999Z");
      where.waktuDatang = waktuFilter;
    }

    const [data, total] = await Promise.all([
      prisma.tamu.findMany({
        where,
        orderBy: { waktuDatang: "desc" },
        skip,
        take: limit,
      }),
      prisma.tamu.count({ where }),
    ]);

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const tenantId = await resolveTenantId(session, body.tenantId);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const { namaLengkap, nik, alamatAsal, tujuan, wargaDikunjungi, nomorHP, nomorKendaraan, foto, catatan } = body;

    if (!namaLengkap || !alamatAsal || !tujuan || !wargaDikunjungi) {
      return errorResponse("Nama lengkap, alamat asal, tujuan, dan warga dikunjungi harus diisi", 400);
    }

    const tamu = await prisma.tamu.create({
      data: {
        tenantId,
        namaLengkap,
        nik: nik || null,
        alamatAsal,
        tujuan,
        wargaDikunjungi,
        nomorHP: nomorHP || null,
        nomorKendaraan: nomorKendaraan || null,
        foto: foto || null,
        catatan: catatan || null,
      },
    });

    return successResponse(tamu, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const tenantId = await resolveTenantId(session, body.tenantId);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const { id } = body;

    if (!id) return errorResponse("ID tamu harus diisi", 400);

    const tamu = await prisma.tamu.updateMany({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      data: { waktuPulang: new Date() },
    });

    if (tamu.count === 0) return errorResponse("Data tamu tidak ditemukan", 404);

    return successResponse({ message: "Waktu pulang berhasil dicatat" });
  } catch (error) {
    return handleApiError(error);
  }
}

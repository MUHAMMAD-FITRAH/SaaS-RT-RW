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

    const where: Record<string, unknown> = tenantId ? { tenantId } : {};

    if (search) {
      where.OR = [
        { pemilik: { contains: search, mode: "insensitive" } },
        { nomorPolisi: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.kendaraan.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.kendaraan.count({ where }),
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

    const { pemilik, jenisKendaraan, merek, nomorPolisi, warna, tahun, stnkBerlaku, foto, rumahId } = body;

    if (!pemilik || !jenisKendaraan || !nomorPolisi) {
      return errorResponse("Pemilik, jenis kendaraan, dan nomor polisi harus diisi", 400);
    }

    if (!["MOTOR", "MOBIL", "SEPEDA", "LAINNYA"].includes(jenisKendaraan)) {
      return errorResponse("Jenis kendaraan tidak valid", 400);
    }

    const kendaraan = await prisma.kendaraan.create({
      data: {
        tenantId,
        rumahId: rumahId || null,
        pemilik,
        jenisKendaraan,
        merek: merek || null,
        nomorPolisi,
        warna: warna || null,
        tahun: tahun ? parseInt(tahun) : null,
        stnkBerlaku: stnkBerlaku ? new Date(stnkBerlaku) : null,
        foto: foto || null,
      },
    });

    return successResponse(kendaraan, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

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
        { namaBarang: { contains: search, mode: "insensitive" } },
        { kategori: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.inventaris.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.inventaris.count({ where }),
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
    const { namaBarang, kategori, jumlah, kondisi, lokasi, tanggalPerolehan, nilaiPerolehan, catatan, foto } = body;

    if (!namaBarang) {
      return errorResponse("Nama barang harus diisi", 400);
    }

    const inventaris = await prisma.inventaris.create({
      data: {
        tenantId,
        namaBarang,
        kategori: kategori || null,
        jumlah: jumlah ? parseInt(jumlah) : 1,
        kondisi: kondisi || null,
        lokasi: lokasi || null,
        tanggalPerolehan: tanggalPerolehan ? new Date(tanggalPerolehan) : null,
        nilaiPerolehan: nilaiPerolehan ? parseFloat(nilaiPerolehan) : null,
        catatan: catatan || null,
        foto: foto || null,
      },
    });

    return successResponse(inventaris, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

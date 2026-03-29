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
    const session = await requireFeature(Feature.PEMBANGUNAN);
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const { page, limit, skip, search } = getPaginationParams(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { judul: { contains: search, mode: "insensitive" } },
        { pengusul: { contains: search, mode: "insensitive" } },
        { lokasi: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.pembangunan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.pembangunan.count({ where }),
    ]);

    return paginatedResponse(
      data.map((d) => ({ ...d, estimasiBiaya: d.estimasiBiaya ? Number(d.estimasiBiaya) : null })),
      total,
      page,
      limit
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireFeature(Feature.PEMBANGUNAN);
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const body = await req.json();
    const { judul, deskripsi, pengusul, estimasiBiaya, lokasi, catatan } = body;

    if (!judul || !pengusul) {
      return errorResponse("Judul dan pengusul wajib diisi", 422);
    }

    const pembangunan = await prisma.pembangunan.create({
      data: {
        tenantId,
        judul,
        deskripsi: deskripsi || null,
        pengusul,
        estimasiBiaya: estimasiBiaya || null,
        lokasi: lokasi || null,
        catatan: catatan || null,
      },
    });

    return successResponse(
      { ...pembangunan, estimasiBiaya: pembangunan.estimasiBiaya ? Number(pembangunan.estimasiBiaya) : null },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireFeature(Feature.PEMBANGUNAN);
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const body = await req.json();
    const { id, judul, deskripsi, pengusul, estimasiBiaya, lokasi, status, catatan } = body;

    if (!id) return errorResponse("ID pembangunan harus diisi", 400);

    const existing = await prisma.pembangunan.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return errorResponse("Data pembangunan tidak ditemukan", 404);

    const updateData: Record<string, unknown> = {};
    if (judul !== undefined) updateData.judul = judul;
    if (deskripsi !== undefined) updateData.deskripsi = deskripsi || null;
    if (pengusul !== undefined) updateData.pengusul = pengusul;
    if (estimasiBiaya !== undefined) updateData.estimasiBiaya = estimasiBiaya || null;
    if (lokasi !== undefined) updateData.lokasi = lokasi || null;
    if (status !== undefined) updateData.status = status;
    if (catatan !== undefined) updateData.catatan = catatan || null;

    const updated = await prisma.pembangunan.update({
      where: { id },
      data: updateData,
    });

    return successResponse({
      ...updated,
      estimasiBiaya: updated.estimasiBiaya ? Number(updated.estimasiBiaya) : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireFeature(Feature.PEMBANGUNAN);
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return errorResponse("ID pembangunan harus diisi", 400);

    const deleted = await prisma.pembangunan.deleteMany({
      where: { id, tenantId },
    });

    if (deleted.count === 0) return errorResponse("Data pembangunan tidak ditemukan", 404);

    return successResponse({ message: "Data pembangunan berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

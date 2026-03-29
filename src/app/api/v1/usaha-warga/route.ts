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
    const session = await requireFeature(Feature.USAHA_WARGA);
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const { page, limit, skip, search } = getPaginationParams(req);

    const where: Record<string, unknown> = { tenantId };
    if (search) {
      where.OR = [
        { namaUsaha: { contains: search, mode: "insensitive" } },
        { pemilik: { contains: search, mode: "insensitive" } },
        { jenis: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.usahaWarga.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { products: true } },
        },
      }),
      prisma.usahaWarga.count({ where }),
    ]);

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireFeature(Feature.USAHA_WARGA);
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const body = await req.json();
    const { namaUsaha, pemilik, jenis, alamat, nomorHP, deskripsi, foto } = body;

    if (!namaUsaha || !pemilik || !jenis) {
      return errorResponse("Nama usaha, pemilik, dan jenis wajib diisi", 422);
    }

    const usaha = await prisma.usahaWarga.create({
      data: {
        tenantId,
        namaUsaha,
        pemilik,
        jenis,
        alamat: alamat || null,
        nomorHP: nomorHP || null,
        deskripsi: deskripsi || null,
        foto: foto || null,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    return successResponse(usaha, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireFeature(Feature.USAHA_WARGA);
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const body = await req.json();
    const { id, namaUsaha, pemilik, jenis, alamat, nomorHP, deskripsi, foto } = body;

    if (!id) return errorResponse("ID usaha harus diisi", 400);

    const existing = await prisma.usahaWarga.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return errorResponse("Usaha tidak ditemukan", 404);

    const updateData: Record<string, unknown> = {};
    if (namaUsaha !== undefined) updateData.namaUsaha = namaUsaha;
    if (pemilik !== undefined) updateData.pemilik = pemilik;
    if (jenis !== undefined) updateData.jenis = jenis;
    if (alamat !== undefined) updateData.alamat = alamat || null;
    if (nomorHP !== undefined) updateData.nomorHP = nomorHP || null;
    if (deskripsi !== undefined) updateData.deskripsi = deskripsi || null;
    if (foto !== undefined) updateData.foto = foto || null;

    const updated = await prisma.usahaWarga.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { products: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireFeature(Feature.USAHA_WARGA);
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return errorResponse("ID usaha harus diisi", 400);

    const updated = await prisma.usahaWarga.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    });

    if (updated.count === 0) return errorResponse("Usaha tidak ditemukan", 404);

    return successResponse({ message: "Usaha berhasil dinonaktifkan" });
  } catch (error) {
    return handleApiError(error);
  }
}

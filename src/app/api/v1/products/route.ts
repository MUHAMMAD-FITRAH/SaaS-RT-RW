import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
  AuthError,
} from "@/server/middleware/api-utils";
import { UserRole } from "@prisma/client";

/**
 * GET /api/v1/products?usahaWargaId=...
 * Returns all products for a given usaha. Admin only.
 */
export async function GET(req: NextRequest) {
  try {
    const session  = await requireAuth();
    const role     = session.user.role as UserRole;
    if (role === "RESIDENT") throw new AuthError("Forbidden", 403);

    const url          = new URL(req.url);
    const usahaWargaId = url.searchParams.get("usahaWargaId");
    if (!usahaWargaId) return errorResponse("usahaWargaId harus diisi", 400);

    const products = await prisma.product.findMany({
      where:   { usahaWargaId },
      orderBy: { createdAt: "asc" },
    });

    return successResponse(products);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/products
 * Add a product to an usaha. Admin only.
 */
export async function POST(req: NextRequest) {
  try {
    const session  = await requireAuth();
    const role     = session.user.role as UserRole;
    const tenantId = session.user.tenantId;
    if (role === "RESIDENT") throw new AuthError("Forbidden", 403);

    const body = await req.json();
    const { usahaWargaId, nama, deskripsi, harga, foto, kategori, stok } = body;

    if (!usahaWargaId || !nama || harga == null) {
      return errorResponse("usahaWargaId, nama, dan harga wajib diisi", 422);
    }

    // Verify usaha belongs to tenant
    const usaha = await prisma.usahaWarga.findFirst({
      where: { id: usahaWargaId, ...(tenantId ? { tenantId } : {}) },
    });
    if (!usaha) return errorResponse("Usaha tidak ditemukan", 404);

    const product = await prisma.product.create({
      data: {
        usahaWargaId,
        nama,
        deskripsi: deskripsi || null,
        harga:     Number(harga),
        foto:      foto      || null,
        kategori:  kategori  || null,
        stok:      stok != null ? Number(stok) : null,
      },
    });

    return successResponse(product, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

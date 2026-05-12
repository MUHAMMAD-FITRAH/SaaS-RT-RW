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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    if (session.user.role === "RESIDENT") throw new AuthError("Forbidden", 403);

    const product = await prisma.product.findUnique({ where: { id: params.id } });
    if (!product) return errorResponse("Produk tidak ditemukan", 404);

    const body = await req.json();
    const { nama, deskripsi, harga, foto, kategori, stok, isAvailable } = body;

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(nama        !== undefined && { nama }),
        ...(deskripsi   !== undefined && { deskripsi: deskripsi || null }),
        ...(harga       != null       && { harga: Number(harga) }),
        ...(foto        !== undefined && { foto: foto || null }),
        ...(kategori    !== undefined && { kategori: kategori || null }),
        ...(stok        !== undefined && { stok: stok != null ? Number(stok) : null }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    if (session.user.role === "RESIDENT") throw new AuthError("Forbidden", 403);

    const deleted = await prisma.product.delete({ where: { id: params.id } }).catch(() => null);
    if (!deleted) return errorResponse("Produk tidak ditemukan", 404);

    return successResponse({ message: "Produk berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

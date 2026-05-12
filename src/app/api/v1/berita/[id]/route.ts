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

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session  = await requireAuth();
    const tenantId = session.user.tenantId;

    const berita = await prisma.berita.findFirst({
      where: {
        id: params.id,
        ...(tenantId ? { tenantId } : {}),
        // residents can only read published
        ...(session.user.role === "RESIDENT" ? { isPublished: true } : {}),
      },
      include: { warga: { select: { id: true, namaLengkap: true } } },
    });

    if (!berita) return errorResponse("Berita tidak ditemukan", 404);
    return successResponse(berita);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session  = await requireAuth();
    const role     = session.user.role as UserRole;
    const tenantId = session.user.tenantId;

    if (role === "RESIDENT") throw new AuthError("Forbidden", 403);

    const existing = await prisma.berita.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!existing) return errorResponse("Berita tidak ditemukan", 404);

    const body = await req.json();
    const { judul, konten, ringkasan, gambar, kategori, penulis, isPublished } = body;

    const updateData: Record<string, unknown> = {};
    if (judul     !== undefined) updateData.judul     = judul;
    if (konten    !== undefined) updateData.konten    = konten;
    if (ringkasan !== undefined) updateData.ringkasan = ringkasan || null;
    if (gambar    !== undefined) updateData.gambar    = gambar    || null;
    if (kategori  !== undefined) updateData.kategori  = kategori  || null;
    if (penulis   !== undefined) updateData.penulis   = penulis;

    if (isPublished !== undefined) {
      updateData.isPublished = isPublished;
      if (isPublished && !existing.isPublished) {
        updateData.publishedAt = new Date();
      } else if (!isPublished) {
        updateData.publishedAt = null;
      }
    }

    const updated = await prisma.berita.update({
      where: { id: params.id },
      data:  updateData,
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
    const session  = await requireAuth();
    const role     = session.user.role as UserRole;
    const tenantId = session.user.tenantId;

    if (role !== "RT_ADMIN" && role !== "RW_ADMIN" && role !== "SUPER_ADMIN") {
      throw new AuthError("Forbidden", 403);
    }

    const deleted = await prisma.berita.deleteMany({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (deleted.count === 0) return errorResponse("Berita tidak ditemukan", 404);

    return successResponse({ message: "Berita berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

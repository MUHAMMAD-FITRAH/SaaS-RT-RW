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
    const session  = await requireAuth();
    const role     = session.user.role as UserRole;
    const tenantId = session.user.tenantId;

    if (role !== "RT_ADMIN" && role !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    const existing = await prisma.organisasi.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!existing) return errorResponse("Pengurus tidak ditemukan", 404);

    const body = await req.json();
    const { nama, jabatan, nomorHP, periode, foto, urutan, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (nama     !== undefined) updateData.nama     = nama;
    if (jabatan  !== undefined) updateData.jabatan  = jabatan;
    if (nomorHP  !== undefined) updateData.nomorHP  = nomorHP  || null;
    if (periode  !== undefined) updateData.periode  = periode  || null;
    if (foto     !== undefined) updateData.foto     = foto     || null;
    if (urutan   !== undefined) updateData.urutan   = Number(urutan);
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.organisasi.update({
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

    if (role !== "RT_ADMIN" && role !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    const deleted = await prisma.organisasi.deleteMany({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (deleted.count === 0) return errorResponse("Pengurus tidak ditemukan", 404);

    return successResponse({ message: "Pengurus berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

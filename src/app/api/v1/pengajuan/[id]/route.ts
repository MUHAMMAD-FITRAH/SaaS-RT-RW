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
    const role = session.user.role as UserRole;
    const tenantId = session.user.tenantId;

    if (role === "RESIDENT") throw new AuthError("Forbidden", 403);

    const body = await req.json();
    const { status, tanggapan } = body;

    const existing = await prisma.pengajuan.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!existing) return errorResponse("Pengajuan tidak ditemukan", 404);

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      updateData.tanggalTanggap = new Date();
    }
    if (tanggapan !== undefined) updateData.tanggapan = tanggapan || null;

    const updated = await prisma.pengajuan.update({
      where: { id: params.id },
      data: updateData,
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
    const role = session.user.role as UserRole;
    const tenantId = session.user.tenantId;

    if (role !== "RT_ADMIN" && role !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    const deleted = await prisma.pengajuan.deleteMany({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (deleted.count === 0) return errorResponse("Pengajuan tidak ditemukan", 404);

    return successResponse({ message: "Pengajuan berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

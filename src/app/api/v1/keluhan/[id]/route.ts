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
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const keluhan = await prisma.keluhan.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
      include: { warga: { select: { id: true, namaLengkap: true, nik: true } } },
    });
    if (!keluhan) return errorResponse("Keluhan tidak ditemukan", 404);

    return successResponse(keluhan);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    const role = session.user.role as UserRole;
    const tenantId = session.user.tenantId;

    // Only admin roles can update status / tanggapan
    if (role === "RESIDENT") throw new AuthError("Forbidden", 403);

    const body = await req.json();
    const { status, tanggapan, tanggalTanggap } = body;

    const keluhan = await prisma.keluhan.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!keluhan) return errorResponse("Keluhan tidak ditemukan", 404);

    const updateData: Record<string, unknown> = {};
    if (status)        updateData.status        = status;
    if (tanggapan !== undefined) updateData.tanggapan = tanggapan || null;
    if (tanggalTanggap) updateData.tanggalTanggap = new Date(tanggalTanggap);
    else if (status && status !== "BARU") updateData.tanggalTanggap = new Date();

    const updated = await prisma.keluhan.update({
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

    const deleted = await prisma.keluhan.deleteMany({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (deleted.count === 0) return errorResponse("Keluhan tidak ditemukan", 404);

    return successResponse({ message: "Keluhan berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

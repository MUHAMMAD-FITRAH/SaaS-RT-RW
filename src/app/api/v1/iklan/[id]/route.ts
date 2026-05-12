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

    const body = await req.json();
    const { action, buktiPembayaran, catatan } = body;

    const iklan = await prisma.iklanUsaha.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!iklan) return errorResponse("Iklan tidak ditemukan", 404);

    // Anyone can upload bukti pembayaran
    if (action === "upload_bukti") {
      const updated = await prisma.iklanUsaha.update({
        where: { id: params.id },
        data:  { buktiPembayaran: buktiPembayaran || null },
      });
      return successResponse(updated);
    }

    // Only admin can activate / reject
    if (role !== "RT_ADMIN" && role !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    if (action === "aktivasi") {
      const mulai  = new Date();
      const selesai = new Date(mulai.getTime() + iklan.durasi * 24 * 60 * 60 * 1000);
      const updated = await prisma.iklanUsaha.update({
        where: { id: params.id },
        data: {
          status:       "AKTIF",
          mulaiTayang:  mulai,
          selesaiTayang: selesai,
          catatan:       catatan || null,
        },
      });
      return successResponse(updated);
    }

    if (action === "tolak") {
      const updated = await prisma.iklanUsaha.update({
        where: { id: params.id },
        data:  { status: "DITOLAK", catatan: catatan || null },
      });
      return successResponse(updated);
    }

    return errorResponse("Action tidak dikenali", 400);
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

    const deleted = await prisma.iklanUsaha.deleteMany({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (deleted.count === 0) return errorResponse("Iklan tidak ditemukan", 404);

    return successResponse({ message: "Iklan berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

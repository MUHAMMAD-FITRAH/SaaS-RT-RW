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
 * PATCH /api/v1/ppob/[id]
 * Admin only — update order status, catatan, buktiUrl.
 * Valid transitions: MENUNGGU → DIPROSES → BERHASIL | GAGAL
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    const role    = session.user.role as UserRole;
    if (role !== "RT_ADMIN" && role !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    const body = await req.json();
    const { status, catatan, buktiUrl } = body;

    const validStatus = ["DIPROSES", "BERHASIL", "GAGAL"];
    if (!validStatus.includes(status)) {
      return errorResponse("Status tidak valid. Pilihan: DIPROSES, BERHASIL, GAGAL", 422);
    }

    const order = await prisma.pPOBOrder.findUnique({ where: { id: params.id } });
    if (!order) return errorResponse("Order tidak ditemukan", 404);

    const updated = await prisma.pPOBOrder.update({
      where: { id: params.id },
      data: {
        status,
        ...(catatan  !== undefined && { catatan:  catatan  || null }),
        ...(buktiUrl !== undefined && { buktiUrl: buktiUrl || null }),
      },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/v1/ppob/[id]
 * Admin only — hard delete an order.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session  = await requireAuth();
    const role     = session.user.role as UserRole;
    const tenantId = session.user.tenantId;
    if (role !== "RT_ADMIN" && role !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    const deleted = await prisma.pPOBOrder.deleteMany({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (deleted.count === 0) return errorResponse("Order tidak ditemukan", 404);

    return successResponse({ message: "Order berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

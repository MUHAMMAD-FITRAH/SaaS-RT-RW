import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
  AuthError,
} from "@/server/middleware/api-utils";
import { MetodeBayar, UserRole } from "@prisma/client";

/**
 * GET /api/v1/iuran/[id]
 * Get single payment detail
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const payment = await prisma.iuranPayment.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
      include: {
        warga: { select: { id: true, namaLengkap: true } },
        iuranType: { select: { id: true, nama: true, periode: true } },
      },
    });

    if (!payment) return errorResponse("Pembayaran tidak ditemukan", 404);

    return successResponse({ ...payment, jumlah: Number(payment.jumlah) });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/v1/iuran/[id]
 * Two use-cases:
 *   1. Warga uploads bukti transfer    → body: { buktiUrl }
 *   2. Admin confirms / rejects        → body: { action: "confirm" | "reject", metodeBayar?, catatan? }
 *   3. Admin manual update             → body: { jumlah?, catatan?, metodeBayar? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const role = session.user.role as UserRole;
    const tenantId = session.user.tenantId;

    const body = await req.json();
    const { action, buktiUrl, metodeBayar, catatan, jumlah } = body;

    const payment = await prisma.iuranPayment.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!payment) return errorResponse("Pembayaran tidak ditemukan", 404);

    // === Warga uploads bukti ===
    if (action === "upload_bukti") {
      // Warga can only upload bukti for their own payment
      if (role === "RESIDENT") {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          include: { warga: true },
        });
        if (!user?.warga || user.warga.id !== payment.wargaId) {
          throw new AuthError("Forbidden", 403);
        }
      }
      const updated = await prisma.iuranPayment.update({
        where: { id: params.id },
        data: { buktiUrl: buktiUrl ?? null },
      });
      return successResponse({ ...updated, jumlah: Number(updated.jumlah) });
    }

    // === Admin-only actions below ===
    if (role !== "RT_ADMIN" && role !== "RW_ADMIN" && role !== "SUPER_ADMIN") {
      throw new AuthError("Forbidden", 403);
    }

    if (action === "confirm") {
      // Admin confirms payment after seeing bukti
      const updated = await prisma.iuranPayment.update({
        where: { id: params.id },
        data: {
          tanggalBayar: new Date(),
          metodeBayar: (metodeBayar as MetodeBayar) ?? "TRANSFER",
          pencatat: session.user.name,
          ...(catatan !== undefined && { catatan }),
        },
      });
      return successResponse({ ...updated, jumlah: Number(updated.jumlah) });
    }

    if (action === "reject") {
      // Admin rejects the bukti — clears buktiUrl, keeps record
      const updated = await prisma.iuranPayment.update({
        where: { id: params.id },
        data: {
          buktiUrl: null,
          tanggalBayar: null,
          ...(catatan !== undefined && { catatan }),
        },
      });
      return successResponse({ ...updated, jumlah: Number(updated.jumlah) });
    }

    // Generic admin update
    const updateData: Record<string, unknown> = {};
    if (jumlah !== undefined) updateData.jumlah = Number(jumlah);
    if (metodeBayar !== undefined) updateData.metodeBayar = metodeBayar as MetodeBayar;
    if (catatan !== undefined) updateData.catatan = catatan;
    if (buktiUrl !== undefined) updateData.buktiUrl = buktiUrl;

    const updated = await prisma.iuranPayment.update({
      where: { id: params.id },
      data: updateData,
    });
    return successResponse({ ...updated, jumlah: Number(updated.jumlah) });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/v1/iuran/[id]
 * Admin deletes a payment record
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const role = session.user.role as UserRole;
    const tenantId = session.user.tenantId;

    if (role !== "RT_ADMIN" && role !== "SUPER_ADMIN") {
      throw new AuthError("Forbidden", 403);
    }

    const deleted = await prisma.iuranPayment.deleteMany({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (deleted.count === 0) return errorResponse("Pembayaran tidak ditemukan", 404);

    return successResponse({ message: "Pembayaran berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

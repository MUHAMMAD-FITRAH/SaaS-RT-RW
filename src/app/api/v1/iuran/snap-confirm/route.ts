import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, successResponse, errorResponse, handleApiError } from "@/server/middleware/api-utils";
import { getTransactionStatus, isPaymentSuccessful, isPaymentFailed, mapPaymentType } from "@/lib/midtrans";

/**
 * POST /api/v1/iuran/snap-confirm
 * Body: { paymentId, orderId }
 *
 * Called by the client after Midtrans Snap fires onSuccess/onPending.
 * Verifies the transaction status against Midtrans API before marking as paid.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await req.json();
    const { paymentId, orderId } = body as { paymentId: string; orderId: string };

    if (!paymentId || !orderId) {
      return errorResponse("paymentId dan orderId wajib diisi", 422);
    }

    // Ownership check
    const payment = await prisma.iuranPayment.findFirst({
      where: { id: paymentId },
      include: { warga: { select: { userId: true, namaLengkap: true } }, iuranType: { select: { nama: true } } },
    });
    if (!payment) return errorResponse("Pembayaran tidak ditemukan", 404);

    if (
      payment.warga.userId !== session.user.id &&
      session.user.role !== "RT_ADMIN" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return errorResponse("Akses ditolak", 403);
    }

    // Already confirmed
    if (payment.tanggalBayar) {
      return successResponse({ alreadyPaid: true, message: "Pembayaran sudah dikonfirmasi sebelumnya" });
    }

    // Verify with Midtrans
    let status;
    try {
      status = await getTransactionStatus(orderId);
    } catch {
      // Midtrans couldn't find this order yet (race condition) — return pending
      return successResponse({ pending: true, message: "Pembayaran sedang diproses, mohon tunggu konfirmasi" });
    }

    if (isPaymentSuccessful(status)) {
      // Mark as paid
      const metodeBayar = mapPaymentType(status.payment_type);
      await prisma.iuranPayment.update({
        where: { id: paymentId },
        data: {
          tanggalBayar: new Date(),
          metodeBayar,
          catatan: `Dibayar via Midtrans · ${status.payment_type} · ${orderId}`,
        },
      });

      return successResponse({ paid: true, message: "Pembayaran berhasil dikonfirmasi!" });
    }

    if (isPaymentFailed(status)) {
      return successResponse({ failed: true, status: status.transaction_status, message: "Pembayaran gagal atau dibatalkan" });
    }

    // Pending
    return successResponse({ pending: true, status: status.transaction_status, message: "Pembayaran sedang diproses" });
  } catch (error) {
    return handleApiError(error);
  }
}

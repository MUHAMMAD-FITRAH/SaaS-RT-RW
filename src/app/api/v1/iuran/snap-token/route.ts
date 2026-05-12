import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, successResponse, errorResponse, handleApiError } from "@/server/middleware/api-utils";
import { createSnapToken, MIDTRANS_SNAP_JS_URL } from "@/lib/midtrans";

const BULAN_LABEL = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

/**
 * POST /api/v1/iuran/snap-token
 * Body: { paymentId }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();

    if (!process.env.MIDTRANS_SERVER_KEY) {
      return errorResponse("Payment gateway belum dikonfigurasi", 503);
    }

    const body = await req.json();
    const { paymentId } = body as { paymentId?: string };
    if (!paymentId) return errorResponse("paymentId wajib diisi", 422);

    // ── Load payment ──────────────────────────────────────────────────────────
    const payment = await prisma.iuranPayment.findFirst({
      where: { id: paymentId },
      include: {
        iuranType: { select: { nama: true } },
        warga: {
          select: {
            id: true,
            namaLengkap: true,
            nomorHP: true,
            userId: true,
            // user email/phone for Midtrans customer_details
            user: { select: { email: true, phone: true } },
          },
        },
      },
    });

    if (!payment) return errorResponse("Pembayaran tidak ditemukan", 404);

    // ── Ownership check ───────────────────────────────────────────────────────
    // Primary:  payment.warga.userId === session.user.id  (warga linked to user account)
    // Fallback: session user's warga.id === payment.wargaId  (look up by user → warga)
    const isAdmin = session.user.role === "RT_ADMIN" || session.user.role === "SUPER_ADMIN";

    if (!isAdmin) {
      let allowed = payment.warga.userId === session.user.id;

      if (!allowed) {
        // Fallback: find warga by userId and compare ids
        const sessionWarga = await prisma.warga.findFirst({
          where:  { userId: session.user.id },
          select: { id: true },
        });
        allowed = !!sessionWarga && sessionWarga.id === payment.wargaId;
      }

      if (!allowed) return errorResponse("Akses ditolak", 403);
    }

    // ── Already paid ──────────────────────────────────────────────────────────
    if (payment.tanggalBayar) {
      return errorResponse("Pembayaran ini sudah dikonfirmasi lunas", 409);
    }

    // ── Build Snap token ──────────────────────────────────────────────────────
    const orderId  = `IURAN-${payment.id}-${Date.now()}`;
    const itemName = `${payment.iuranType.nama} ${BULAN_LABEL[payment.bulan - 1]} ${payment.tahun}`;

    const snap = await createSnapToken({
      orderId,
      grossAmount: Number(payment.jumlah),
      firstName:   payment.warga.namaLengkap,
      email:       payment.warga.user?.email    ?? undefined,
      phone:       payment.warga.user?.phone    ?? payment.warga.nomorHP ?? undefined,
      itemId:      payment.id,
      itemName,
    });

    return successResponse({
      snapToken:   snap.token,
      redirectUrl: snap.redirect_url,
      clientKey:   process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "",
      snapJsUrl:   MIDTRANS_SNAP_JS_URL,
      orderId,
      paymentId:   payment.id,
      jumlah:      Number(payment.jumlah),
      itemName,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

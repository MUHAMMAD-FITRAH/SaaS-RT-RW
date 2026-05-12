import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  verifyNotificationSignature,
  isPaymentSuccessful,
  isPaymentFailed,
  mapPaymentType,
  type MidtransStatusResponse,
} from "@/lib/midtrans";

/**
 * POST /api/v1/iuran/notification
 *
 * Midtrans webhook — configure in Midtrans Dashboard:
 *   Payment Notification URL: https://yourdomain.com/api/v1/iuran/notification
 *
 * Payload from Midtrans includes signature_key for verification.
 * orderId format: IURAN-{paymentId}-{timestamp}
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as MidtransStatusResponse;

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      payment_type,
    } = body;

    // ── 1. Verify signature ───────────────────────────────────────────────────
    if (signature_key) {
      const valid = verifyNotificationSignature(order_id, status_code, gross_amount, signature_key);
      if (!valid) {
        console.warn(`[Midtrans] Invalid signature for order ${order_id}`);
        return NextResponse.json({ ok: false }, { status: 400 });
      }
    }

    // ── 2. Parse paymentId from orderId ───────────────────────────────────────
    // Format: IURAN-{paymentId}-{timestamp}
    if (!order_id.startsWith("IURAN-")) {
      // Not an iuran payment — ignore silently
      return NextResponse.json({ ok: true });
    }

    const parts     = order_id.split("-");
    const paymentId = parts[1]; // index 1 = paymentId (CUID)

    if (!paymentId) {
      console.warn(`[Midtrans] Could not parse paymentId from orderId: ${order_id}`);
      return NextResponse.json({ ok: true });
    }

    // ── 3. Find payment ───────────────────────────────────────────────────────
    const payment = await prisma.iuranPayment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      console.warn(`[Midtrans] IuranPayment not found: ${paymentId}`);
      return NextResponse.json({ ok: true }); // Acknowledge to prevent retries
    }

    // ── 4. Handle status ──────────────────────────────────────────────────────
    if (isPaymentSuccessful(body) && !payment.tanggalBayar) {
      const metodeBayar = mapPaymentType(payment_type ?? "");
      await prisma.iuranPayment.update({
        where: { id: paymentId },
        data: {
          tanggalBayar: new Date(),
          metodeBayar,
          catatan: `Dibayar via Midtrans · ${payment_type} · ${order_id}`,
        },
      });
      console.log(`[Midtrans] Payment confirmed: ${paymentId} via ${payment_type}`);
    } else if (isPaymentFailed(body)) {
      console.log(`[Midtrans] Payment ${transaction_status}: ${paymentId}`);
      // Optionally: record failed attempt in catatan
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Midtrans notification error]", error);
    // Always return 200 to prevent Midtrans retries on server errors
    return NextResponse.json({ ok: true });
  }
}

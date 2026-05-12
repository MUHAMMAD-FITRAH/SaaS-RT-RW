import { NextRequest, NextResponse } from "next/server";
import { MidtransProvider } from "@/lib/payment/providers/midtrans";
import { handlePaymentUpdate } from "@/lib/payment/webhook-helper";

/**
 * Midtrans HTTP Notification / Webhook
 * POST /api/webhooks/midtrans
 *
 * Midtrans sends a JSON body with:
 *   order_id, transaction_status, status_code, gross_amount, signature_key, ...
 *
 * Configure the notification URL in Midtrans dashboard:
 *   Settings → Configuration → Payment Notification URL
 *   → https://yourdomain.com/api/webhooks/midtrans
 */
export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    order_id,
    transaction_status,
    status_code,
    gross_amount,
    signature_key,
    transaction_id,
    payment_type,
  } = body;

  if (!order_id || !signature_key) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify signature
  const midtrans = new MidtransProvider();
  if (!midtrans.verifySignature(order_id, status_code, gross_amount, signature_key)) {
    console.warn("[midtrans webhook] Invalid signature for order:", order_id);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Map Midtrans status → our status
  let status: "PAID" | "FAILED" | "EXPIRED" | "PENDING" = "PENDING";
  if (transaction_status === "settlement" || transaction_status === "capture") {
    status = "PAID";
  } else if (["cancel", "deny", "failure"].includes(transaction_status)) {
    status = "FAILED";
  } else if (transaction_status === "expire") {
    status = "EXPIRED";
  }

  try {
    await handlePaymentUpdate({
      orderId: order_id,
      externalId: transaction_id ?? order_id,
      status,
      metadata: { payment_type, transaction_status },
    });
  } catch (err) {
    console.error("[midtrans webhook] handlePaymentUpdate error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

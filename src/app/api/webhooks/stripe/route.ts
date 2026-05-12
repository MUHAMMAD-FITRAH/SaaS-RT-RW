import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { handlePaymentUpdate } from "@/lib/payment/webhook-helper";

/**
 * Stripe Webhook
 * POST /api/webhooks/stripe
 *
 * Configure in Stripe dashboard or with Stripe CLI:
 *   stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *
 * Events handled:
 *   checkout.session.completed  → payment confirmed
 *   checkout.session.expired    → session expired
 */
export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2026-02-25.clover" });

  // Must use raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.warn("[stripe webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId ?? session.client_reference_id ?? "";
        if (!orderId) break;

        await handlePaymentUpdate({
          orderId,
          externalId: session.id,
          status: "PAID",
          metadata: {
            stripe_session_id: session.id,
            payment_status: session.payment_status,
            amount_total: session.amount_total,
          },
        });
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId ?? session.client_reference_id ?? "";
        if (!orderId) break;

        await handlePaymentUpdate({
          orderId,
          externalId: session.id,
          status: "EXPIRED",
          metadata: { stripe_session_id: session.id },
        });
        break;
      }

      // Add more event types as needed (e.g. invoice.payment_failed for subscriptions)
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

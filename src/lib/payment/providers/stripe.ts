import Stripe from "stripe";
import type {
  IPaymentProvider,
  CreatePaymentParams,
  PaymentResult,
  PaymentStatusResult,
  PaymentStatus,
} from "../types";

/**
 * Stripe Checkout Session adapter
 * Docs: https://stripe.com/docs/checkout/quickstart
 *
 * Env vars required:
 *   STRIPE_SECRET_KEY        – sk_test_... or sk_live_...
 *   STRIPE_WEBHOOK_SECRET    – whsec_... from `stripe listen` or dashboard
 *   STRIPE_PRICE_TIER_A      – Stripe Price ID for Tier A
 *   STRIPE_PRICE_TIER_B      – Stripe Price ID for Tier B
 *   STRIPE_PRICE_TIER_C      – Stripe Price ID for Tier C
 *   STRIPE_PUBLISHABLE_KEY   – pk_test_... (used on front-end)
 */
export class StripeProvider implements IPaymentProvider {
  readonly name = "STRIPE" as const;

  private get client() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    return new Stripe(key, { apiVersion: "2026-02-25.clover" });
  }

  private priceIdForTier(tier: string): string {
    const map: Record<string, string | undefined> = {
      TIER_A: process.env.STRIPE_PRICE_TIER_A,
      TIER_B: process.env.STRIPE_PRICE_TIER_B,
      TIER_C: process.env.STRIPE_PRICE_TIER_C,
    };
    const priceId = map[tier];
    if (!priceId) throw new Error(`No Stripe Price ID configured for ${tier}`);
    return priceId;
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const stripe = this.client;

    const session = await stripe.checkout.sessions.create({
      mode: "payment", // "subscription" for recurring — change if needed
      payment_method_types: ["card"],
      customer_email: params.customerEmail,
      client_reference_id: params.orderId,
      line_items: [
        {
          price: this.priceIdForTier(params.tier),
          quantity: 1,
        },
      ],
      success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}&order_id=${params.orderId}`,
      cancel_url: params.failureUrl,
      metadata: {
        orderId: params.orderId,
        tenantId: params.tenantId,
        tier: params.tier,
      },
    });

    return {
      provider: "STRIPE",
      externalId: session.id,
      paymentUrl: session.url!,
      expiredAt: session.expires_at
        ? new Date(session.expires_at * 1000)
        : undefined,
    };
  }

  async getStatus(sessionId: string): Promise<PaymentStatusResult> {
    const stripe = this.client;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    let status: PaymentStatus = "PENDING";
    if (session.payment_status === "paid") status = "PAID";
    else if (session.status === "expired") status = "EXPIRED";

    return {
      orderId: session.client_reference_id ?? sessionId,
      externalId: sessionId,
      status,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      paidAt: status === "PAID" ? new Date() : undefined,
    };
  }
}

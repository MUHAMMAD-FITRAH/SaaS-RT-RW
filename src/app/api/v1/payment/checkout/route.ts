import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/server/middleware/api-utils";
import {
  getPaymentProvider,
  getConfiguredProviders,
  generateOrderId,
} from "@/lib/payment";
import { TIER_PRICES } from "@/lib/constants";
import { SubscriptionTier, PaymentProvider } from "@prisma/client";

const TIER_ORDER: Record<string, number> = { TIER_A: 1, TIER_B: 2, TIER_C: 3 };

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const body = await req.json();
    const { tier, provider } = body as { tier?: string; provider?: string };

    if (!tier || !TIER_PRICES[tier as SubscriptionTier]) {
      return errorResponse("Tier tidak valid", 422);
    }

    // Validate provider is configured
    const configured = getConfiguredProviders();
    const chosenProvider = (provider ?? configured[0] ?? "MANUAL").toUpperCase();
    if (chosenProvider !== "MANUAL" && !configured.includes(chosenProvider as never)) {
      return errorResponse(`Provider "${chosenProvider}" belum dikonfigurasi`, 422);
    }

    // Get tenant + subscription
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
        users: { where: { id: session.user.id }, take: 1 },
      },
    });
    if (!tenant) return errorResponse("Tenant tidak ditemukan", 404);

    const currentTier = tenant.subscription?.tier ?? "TIER_A";
    if (TIER_ORDER[tier] <= TIER_ORDER[currentTier]) {
      return errorResponse("Hanya bisa upgrade ke tier yang lebih tinggi", 422);
    }

    // Amount
    const amount = TIER_PRICES[tier as SubscriptionTier].monthly;
    const orderId = generateOrderId(tenantId, tier);
    const user = tenant.users[0];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // Create pending transaction record
    await prisma.paymentTransaction.create({
      data: {
        tenantId,
        orderId,
        provider: chosenProvider as PaymentProvider,
        tier: tier as SubscriptionTier,
        amount,
        currency: "IDR",
        status: "PENDING",
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Call payment provider
    const paymentProvider = getPaymentProvider(chosenProvider);
    const result = await paymentProvider.createPayment({
      orderId,
      amount,
      currency: "IDR",
      customerName: user?.name ?? tenant.name,
      customerEmail: user?.email ?? tenant.email ?? `${tenant.slug}@rt.online`,
      customerPhone: user?.phone ?? tenant.phone ?? undefined,
      description: `Langganan RT Online ${TIER_PRICES[tier as SubscriptionTier].label} - ${tenant.name}`,
      tier,
      tenantId,
      successUrl: `${appUrl}/pengaturan/langganan?payment=success&order_id=${orderId}`,
      failureUrl: `${appUrl}/pengaturan/langganan?payment=failed&order_id=${orderId}`,
      notificationUrl: `${appUrl}/api/webhooks/${chosenProvider.toLowerCase()}`,
    });

    // Update transaction with provider response
    await prisma.paymentTransaction.update({
      where: { orderId },
      data: {
        externalId: result.externalId,
        snapToken: result.snapToken,
        paymentUrl: result.paymentUrl,
        expiredAt: result.expiredAt,
      },
    });

    return successResponse({
      orderId,
      provider: chosenProvider,
      paymentUrl: result.paymentUrl,
      snapToken: result.snapToken ?? null,
      amount,
      tier,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** GET /api/v1/payment/checkout?providers=1 — list configured providers */
export async function GET() {
  try {
    await requireAuth();
    return successResponse({ providers: getConfiguredProviders() });
  } catch (error) {
    return handleApiError(error);
  }
}

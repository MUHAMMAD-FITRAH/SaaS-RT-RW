import prisma from "@/lib/db";

/**
 * Shared webhook handler — updates PaymentTransaction + activates Subscription.
 * Called by Midtrans, Stripe, and Xendit webhook routes.
 */
export async function handlePaymentUpdate({
  orderId,
  externalId,
  status,
  metadata,
}: {
  orderId: string;
  externalId: string;
  status: "PAID" | "FAILED" | "EXPIRED" | "PENDING";
  metadata?: Record<string, unknown>;
}) {
  const tx = await prisma.paymentTransaction.findUnique({
    where: { orderId },
  });

  if (!tx) {
    console.warn("[payment webhook] Transaction not found:", orderId);
    return;
  }

  // Update transaction record
  await prisma.paymentTransaction.update({
    where: { orderId },
    data: {
      externalId,
      status,
      paidAt: status === "PAID" ? new Date() : undefined,
      metadata: metadata as object,
    },
  });

  // If paid — activate / upgrade the subscription
  if (status === "PAID") {
    const now       = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.subscription.upsert({
      where:  { tenantId: tx.tenantId },
      update: {
        tier:               tx.tier,
        status:             "ACTIVE",
        paymentProvider:    tx.provider,
        currentPeriodStart: now,
        currentPeriodEnd:   periodEnd,
        cancelAtPeriodEnd:  false,
      },
      create: {
        tenantId:           tx.tenantId,
        tier:               tx.tier,
        status:             "ACTIVE",
        paymentProvider:    tx.provider,
        currentPeriodStart: now,
        currentPeriodEnd:   periodEnd,
      },
    });

    console.log(`[payment] Subscription activated: tenant=${tx.tenantId} tier=${tx.tier}`);
  }
}

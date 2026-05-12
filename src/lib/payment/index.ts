import { MidtransProvider } from "./providers/midtrans";
import { XenditProvider } from "./providers/xendit";
import { StripeProvider } from "./providers/stripe";
import type { IPaymentProvider, PaymentProviderName } from "./types";

export type { IPaymentProvider, CreatePaymentParams, PaymentResult, PaymentStatusResult, PaymentProviderName, PaymentStatus } from "./types";
export { MidtransProvider } from "./providers/midtrans";
export { XenditProvider } from "./providers/xendit";
export { StripeProvider } from "./providers/stripe";

/**
 * Factory: return the correct provider adapter by name.
 * Falls back to PAYMENT_PROVIDER env var, then MIDTRANS.
 */
export function getPaymentProvider(name?: string): IPaymentProvider {
  const chosen = (name ?? process.env.PAYMENT_PROVIDER ?? "MIDTRANS").toUpperCase() as PaymentProviderName;

  switch (chosen) {
    case "MIDTRANS": return new MidtransProvider();
    case "XENDIT":   return new XenditProvider();
    case "STRIPE":   return new StripeProvider();
    default:
      throw new Error(`Unknown payment provider: "${chosen}". Supported: MIDTRANS, XENDIT, STRIPE`);
  }
}

/**
 * Returns every provider that has credentials configured in env.
 * Used by the UI to show only available payment methods.
 */
export function getConfiguredProviders(): PaymentProviderName[] {
  const list: PaymentProviderName[] = [];
  if (process.env.MIDTRANS_SERVER_KEY) list.push("MIDTRANS");
  if (process.env.XENDIT_SECRET_KEY)   list.push("XENDIT");
  if (process.env.STRIPE_SECRET_KEY)   list.push("STRIPE");
  return list;
}

/** Generate a unique, self-describing order ID */
export function generateOrderId(tenantId: string, tier: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const slug = tenantId.slice(-6).toUpperCase();
  return `RT-${slug}-${tier}-${ts}`;
}

// ============================================================
// Payment Gateway — Provider-agnostic types
// ============================================================

export type PaymentProviderName = "MIDTRANS" | "XENDIT" | "STRIPE" | "MANUAL";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "REFUNDED";

export interface CreatePaymentParams {
  /** Our internal order ID, unique per transaction */
  orderId: string;
  /** Amount in IDR (or relevant currency) — no decimals for IDR */
  amount: number;
  currency?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  description: string;
  /** Subscription tier being purchased */
  tier: string;
  tenantId: string;
  /** URL to redirect after successful payment */
  successUrl: string;
  /** URL to redirect on cancel / failure */
  failureUrl: string;
  /** Our webhook endpoint URL for server-to-server notification */
  notificationUrl: string;
}

export interface PaymentResult {
  provider: PaymentProviderName;
  /** Provider's own transaction/invoice ID */
  externalId: string;
  /** URL to send the user to for payment */
  paymentUrl: string;
  /** Midtrans Snap token — available when provider = MIDTRANS */
  snapToken?: string;
  expiredAt?: Date;
}

export interface PaymentStatusResult {
  orderId: string;
  externalId: string;
  status: PaymentStatus;
  amount: number;
  paidAt?: Date;
}

export interface IPaymentProvider {
  readonly name: PaymentProviderName;
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  getStatus(externalId: string): Promise<PaymentStatusResult>;
}

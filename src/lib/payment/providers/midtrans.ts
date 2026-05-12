import { createHash } from "crypto";
import type {
  IPaymentProvider,
  CreatePaymentParams,
  PaymentResult,
  PaymentStatusResult,
  PaymentStatus,
} from "../types";

/**
 * Midtrans Snap API adapter
 * Docs: https://docs.midtrans.com/reference/snap-overview
 *
 * Env vars required:
 *   MIDTRANS_SERVER_KEY   – Server/secret key from Midtrans dashboard
 *   MIDTRANS_CLIENT_KEY   – Client key (used on front-end, not here)
 *   MIDTRANS_IS_PRODUCTION – "true" for production, omit/false for sandbox
 */
export class MidtransProvider implements IPaymentProvider {
  readonly name = "MIDTRANS" as const;

  private get serverKey() {
    const k = process.env.MIDTRANS_SERVER_KEY;
    if (!k) throw new Error("MIDTRANS_SERVER_KEY is not set");
    return k;
  }

  private get isProduction() {
    return process.env.MIDTRANS_IS_PRODUCTION === "true";
  }

  private get snapBaseUrl() {
    return this.isProduction
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com";
  }

  private get apiBaseUrl() {
    return this.isProduction
      ? "https://api.midtrans.com"
      : "https://api.sandbox.midtrans.com";
  }

  private authHeader() {
    return "Basic " + Buffer.from(`${this.serverKey}:`).toString("base64");
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const body = {
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.amount,
      },
      customer_details: {
        first_name: params.customerName,
        email: params.customerEmail,
        phone: params.customerPhone ?? "",
      },
      item_details: [
        {
          id: params.tier,
          price: params.amount,
          quantity: 1,
          name: `Langganan RT Online – ${params.tier}`,
        },
      ],
      callbacks: {
        finish: params.successUrl,
        error: params.failureUrl,
        pending: params.successUrl,
      },
    };

    const res = await fetch(`${this.snapBaseUrl}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader(),
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error_messages?: string[] }).error_messages?.join(", ") ||
          `Midtrans error ${res.status}`
      );
    }

    const data = (await res.json()) as { token: string; redirect_url: string };

    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 24);

    return {
      provider: "MIDTRANS",
      externalId: params.orderId,
      paymentUrl: data.redirect_url,
      snapToken: data.token,
      expiredAt,
    };
  }

  async getStatus(orderId: string): Promise<PaymentStatusResult> {
    const res = await fetch(`${this.apiBaseUrl}/v2/${orderId}/status`, {
      headers: { Authorization: this.authHeader() },
    });

    const data = (await res.json()) as {
      transaction_id?: string;
      transaction_status?: string;
      gross_amount?: string;
      settlement_time?: string;
      transaction_time?: string;
    };

    const txStatus = data.transaction_status ?? "";
    let status: PaymentStatus = "PENDING";
    if (txStatus === "settlement" || txStatus === "capture") status = "PAID";
    else if (["cancel", "deny", "failure"].includes(txStatus)) status = "FAILED";
    else if (txStatus === "expire") status = "EXPIRED";

    return {
      orderId,
      externalId: data.transaction_id ?? orderId,
      status,
      amount: Number(data.gross_amount ?? 0),
      paidAt:
        status === "PAID"
          ? new Date(data.settlement_time ?? data.transaction_time ?? Date.now())
          : undefined,
    };
  }

  /**
   * Verify the notification signature from Midtrans webhook.
   * SHA512(order_id + status_code + gross_amount + SERVER_KEY)
   */
  verifySignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signatureKey: string
  ): boolean {
    const expected = createHash("sha512")
      .update(`${orderId}${statusCode}${grossAmount}${this.serverKey}`)
      .digest("hex");
    return expected === signatureKey;
  }
}

import type {
  IPaymentProvider,
  CreatePaymentParams,
  PaymentResult,
  PaymentStatusResult,
  PaymentStatus,
} from "../types";

/**
 * Xendit Invoice API adapter
 * Docs: https://developers.xendit.co/api-reference/#create-invoice
 *
 * Env vars required:
 *   XENDIT_SECRET_KEY     – Secret API key from Xendit dashboard
 *   XENDIT_WEBHOOK_TOKEN  – Verification token set in Xendit webhook settings
 */
export class XenditProvider implements IPaymentProvider {
  readonly name = "XENDIT" as const;

  private get secretKey() {
    const k = process.env.XENDIT_SECRET_KEY;
    if (!k) throw new Error("XENDIT_SECRET_KEY is not set");
    return k;
  }

  private authHeader() {
    return "Basic " + Buffer.from(`${this.secretKey}:`).toString("base64");
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const body = {
      external_id: params.orderId,
      amount: params.amount,
      currency: params.currency ?? "IDR",
      description: params.description,
      payer_email: params.customerEmail,
      customer: {
        given_names: params.customerName,
        email: params.customerEmail,
        mobile_number: params.customerPhone ?? "",
      },
      items: [
        {
          name: `Langganan RT Online – ${params.tier}`,
          quantity: 1,
          price: params.amount,
          category: "subscription",
        },
      ],
      success_redirect_url: params.successUrl,
      failure_redirect_url: params.failureUrl,
      invoice_duration: 86400, // 24 hours
      should_send_email: false,
      // Xendit will POST the notification to this URL
      ...(params.notificationUrl ? { callback_virtual_account_created: undefined } : {}),
    };

    const res = await fetch("https://api.xendit.co/v2/invoices", {
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
        (err as { message?: string }).message ?? `Xendit error ${res.status}`
      );
    }

    const data = (await res.json()) as {
      id: string;
      invoice_url: string;
      expiry_date: string;
    };

    return {
      provider: "XENDIT",
      externalId: data.id,
      paymentUrl: data.invoice_url,
      expiredAt: new Date(data.expiry_date),
    };
  }

  async getStatus(externalId: string): Promise<PaymentStatusResult> {
    const res = await fetch(`https://api.xendit.co/v2/invoices/${externalId}`, {
      headers: { Authorization: this.authHeader() },
    });

    const data = (await res.json()) as {
      id: string;
      external_id: string;
      status: string;
      amount: number;
      paid_amount?: number;
      paid_at?: string;
    };

    let status: PaymentStatus = "PENDING";
    if (data.status === "PAID") status = "PAID";
    else if (data.status === "EXPIRED") status = "EXPIRED";
    else if (data.status === "SETTLED") status = "PAID";

    return {
      orderId: data.external_id,
      externalId: data.id,
      status,
      amount: data.paid_amount ?? data.amount,
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
    };
  }

  /**
   * Verify incoming webhook by checking the x-callback-token header.
   */
  verifyWebhookToken(token: string): boolean {
    const expected = process.env.XENDIT_WEBHOOK_TOKEN ?? "";
    return expected.length > 0 && expected === token;
  }
}

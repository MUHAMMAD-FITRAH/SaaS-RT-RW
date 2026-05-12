/**
 * Midtrans Snap utility — server-side only (uses server key).
 * Client key is exposed via NEXT_PUBLIC_MIDTRANS_CLIENT_KEY.
 */

const SERVER_KEY  = process.env.MIDTRANS_SERVER_KEY ?? "";
const IS_SANDBOX  = process.env.MIDTRANS_ENV !== "production";

const SNAP_BASE_URL = IS_SANDBOX
  ? "https://app.sandbox.midtrans.com/snap/v1"
  : "https://app.midtrans.com/snap/v1";

const STATUS_BASE_URL = IS_SANDBOX
  ? "https://api.sandbox.midtrans.com/v2"
  : "https://api.midtrans.com/v2";

/** Snap.js CDN URL — injected by client components */
export const MIDTRANS_SNAP_JS_URL = IS_SANDBOX
  ? "https://app.sandbox.midtrans.com/snap/snap.js"
  : "https://app.midtrans.com/snap/snap.js";

function authHeader() {
  return "Basic " + Buffer.from(SERVER_KEY + ":").toString("base64");
}

// ─── Create Snap Token ────────────────────────────────────────────────────────

export interface SnapParams {
  orderId:     string;
  grossAmount: number;
  firstName:   string;
  email?:      string;
  phone?:      string;
  itemId:      string;
  itemName:    string;
}

export async function createSnapToken(p: SnapParams): Promise<{ token: string; redirect_url: string }> {
  const body = {
    transaction_details: {
      order_id:     p.orderId,
      gross_amount: Math.round(p.grossAmount),
    },
    customer_details: {
      first_name: p.firstName,
      ...(p.email && { email: p.email }),
      ...(p.phone && { phone: p.phone }),
    },
    item_details: [
      {
        id:       p.itemId,
        price:    Math.round(p.grossAmount),
        quantity: 1,
        name:     p.itemName.slice(0, 50), // Midtrans max 50 chars
      },
    ],
    callbacks: {
      finish: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/iuran-saya`,
    },
  };

  const res = await fetch(`${SNAP_BASE_URL}/transactions`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Midtrans createSnapToken failed: ${res.status} — ${text}`);
  }

  return res.json();
}

// ─── Check Transaction Status ─────────────────────────────────────────────────

export interface MidtransStatusResponse {
  transaction_id:     string;
  order_id:           string;
  transaction_status: string; // settlement | capture | pending | deny | cancel | expire | failure
  fraud_status?:      string; // accept | challenge | deny
  payment_type:       string;
  gross_amount:       string;
  status_code:        string;
  signature_key?:     string;
}

export async function getTransactionStatus(orderId: string): Promise<MidtransStatusResponse> {
  const res = await fetch(`${STATUS_BASE_URL}/${encodeURIComponent(orderId)}/status`, {
    headers: { Authorization: authHeader() },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Midtrans status check failed: ${res.status} — ${text}`);
  }

  return res.json();
}

// ─── Verify Notification Signature ───────────────────────────────────────────

import crypto from "crypto";

export function verifyNotificationSignature(
  orderId:     string,
  statusCode:  string,
  grossAmount: string,
  signatureKey: string,
): boolean {
  const expected = crypto
    .createHash("sha512")
    .update(orderId + statusCode + grossAmount + SERVER_KEY)
    .digest("hex");
  return expected === signatureKey;
}

// ─── Payment Type → MetodeBayar ───────────────────────────────────────────────

export type MetodeBayarPrisma = "TUNAI" | "TRANSFER" | "EWALLET" | "LAINNYA";

export function mapPaymentType(paymentType: string): MetodeBayarPrisma {
  const type = paymentType.toLowerCase();
  if (["credit_card", "bank_transfer", "echannel", "permata", "bca_va", "bni_va", "bri_va", "mandiri_clickpay"].some((t) => type.includes(t))) {
    return "TRANSFER";
  }
  if (["gopay", "qris", "dana", "ovo", "shopeepay", "linkaja"].some((t) => type.includes(t))) {
    return "EWALLET";
  }
  return "LAINNYA";
}

// ─── Is Payment Successful ────────────────────────────────────────────────────

export function isPaymentSuccessful(status: MidtransStatusResponse): boolean {
  const { transaction_status, fraud_status } = status;
  if (transaction_status === "capture") return fraud_status === "accept";
  return transaction_status === "settlement";
}

export function isPaymentFailed(status: MidtransStatusResponse): boolean {
  return ["deny", "cancel", "expire", "failure"].includes(status.transaction_status);
}

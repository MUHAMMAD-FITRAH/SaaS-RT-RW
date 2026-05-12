import { NextRequest, NextResponse } from "next/server";
import { XenditProvider } from "@/lib/payment/providers/xendit";
import { handlePaymentUpdate } from "../midtrans/route";

/**
 * Xendit Invoice Webhook
 * POST /api/webhooks/xendit
 *
 * Xendit sends JSON notifications with header: x-callback-token
 * Configure in Xendit dashboard:
 *   Settings → Callbacks → Invoice → https://yourdomain.com/api/webhooks/xendit
 */
export async function POST(req: NextRequest) {
  // Verify callback token
  const callbackToken = req.headers.get("x-callback-token") ?? "";
  const xendit = new XenditProvider();

  if (!xendit.verifyWebhookToken(callbackToken)) {
    console.warn("[xendit webhook] Invalid callback token");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    id,           // Xendit invoice ID
    external_id,  // Our orderId
    status,
    paid_amount,
    amount,
    paid_at,
  } = body as {
    id: string;
    external_id: string;
    status: string;
    paid_amount?: number;
    amount?: number;
    paid_at?: string;
  };

  if (!external_id) {
    return NextResponse.json({ error: "Missing external_id" }, { status: 400 });
  }

  let mappedStatus: "PAID" | "FAILED" | "EXPIRED" | "PENDING" = "PENDING";
  if (status === "PAID" || status === "SETTLED") mappedStatus = "PAID";
  else if (status === "EXPIRED") mappedStatus = "EXPIRED";

  try {
    await handlePaymentUpdate({
      orderId: external_id,
      externalId: id,
      status: mappedStatus,
      metadata: { xendit_status: status, paid_amount, amount, paid_at },
    });
  } catch (err) {
    console.error("[xendit webhook] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

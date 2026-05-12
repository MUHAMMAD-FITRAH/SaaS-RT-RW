import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requirePermission,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/server/middleware/api-utils";
import { PaymentProvider, PaymentTransactionStatus, SubscriptionTier } from "@prisma/client";

/** GET /api/v1/admin/payments — list all payment transactions (SUPER_ADMIN) */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("tenant:*");

    const { searchParams } = new URL(req.url);
    const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
    const limit    = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const search   = searchParams.get("search") ?? "";
    const provider = searchParams.get("provider") as PaymentProvider | null;
    const status   = searchParams.get("status") as PaymentTransactionStatus | null;
    const tier     = searchParams.get("tier") as SubscriptionTier | null;
    const skip     = (page - 1) * limit;

    const where = {
      ...(provider ? { provider } : {}),
      ...(status   ? { status }   : {}),
      ...(tier     ? { tier }     : {}),
      ...(search   ? { tenant: { name: { contains: search, mode: "insensitive" as const } } } : {}),
    };

    const [total, transactions] = await Promise.all([
      prisma.paymentTransaction.count({ where }),
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          tenant: { select: { id: true, name: true, slug: true, rtNumber: true, rwNumber: true } },
        },
      }),
    ]);

    // Summary stats
    const [stats] = await Promise.all([
      prisma.paymentTransaction.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    return successResponse({
      transactions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        stats,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH /api/v1/admin/payments — manually activate subscription (mark as paid) */
export async function PATCH(req: NextRequest) {
  try {
    await requirePermission("tenant:*");

    const body = await req.json();
    const { orderId, action } = body as { orderId: string; action: "activate" | "cancel" };

    if (!orderId || !action) return errorResponse("orderId dan action wajib diisi", 422);

    const tx = await prisma.paymentTransaction.findUnique({ where: { orderId } });
    if (!tx) return errorResponse("Transaksi tidak ditemukan", 404);

    if (action === "activate") {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await Promise.all([
        prisma.paymentTransaction.update({
          where: { orderId },
          data: { status: "PAID", paidAt: now },
        }),
        prisma.subscription.upsert({
          where: { tenantId: tx.tenantId },
          update: {
            tier: tx.tier,
            status: "ACTIVE",
            paymentProvider: tx.provider,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
          create: {
            tenantId: tx.tenantId,
            tier: tx.tier,
            status: "ACTIVE",
            paymentProvider: tx.provider,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        }),
      ]);

      return successResponse({ message: "Langganan berhasil diaktifkan" });
    }

    if (action === "cancel") {
      await prisma.paymentTransaction.update({
        where: { orderId },
        data: { status: "FAILED" },
      });
      return successResponse({ message: "Transaksi dibatalkan" });
    }

    return errorResponse("Action tidak valid", 422);
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/server/middleware/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

    const transactions = await prisma.paymentTransaction.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        orderId: true,
        provider: true,
        tier: true,
        amount: true,
        currency: true,
        status: true,
        paymentUrl: true,
        paidAt: true,
        expiredAt: true,
        createdAt: true,
      },
    });

    return successResponse(transactions);
  } catch (error) {
    return handleApiError(error);
  }
}

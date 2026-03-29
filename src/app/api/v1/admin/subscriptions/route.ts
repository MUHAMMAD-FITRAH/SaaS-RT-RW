import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, successResponse, handleApiError, getPaginationParams, paginatedResponse, AuthError } from "@/server/middleware/api-utils";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if ((session.user.role as UserRole) !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    const { page, limit, skip, search } = getPaginationParams(req);

    const where = search
      ? { tenant: { name: { contains: search, mode: "insensitive" as const } } }
      : {};

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, slug: true, isActive: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.subscription.count({ where }),
    ]);

    return paginatedResponse(subscriptions, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    if ((session.user.role as UserRole) !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    const body = await req.json();
    const { subscriptionId, tier, status } = body;

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        ...(tier && { tier }),
        ...(status && { status }),
      },
      include: { tenant: { select: { name: true } } },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

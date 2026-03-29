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
      ? { OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ] }
      : {};

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          subscription: true,
          _count: { select: { users: true, warga: true, rumah: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.tenant.count({ where }),
    ]);

    return paginatedResponse(tenants, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if ((session.user.role as UserRole) !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    const body = await req.json();
    const { name, slug, rtNumber, rwNumber, kelurahan, kecamatan, kota, provinsi } = body;

    const tenant = await prisma.tenant.create({
      data: {
        name, slug, rtNumber, rwNumber,
        kelurahan, kecamatan, kota, provinsi,
        subscription: {
          create: { tier: "TIER_A", status: "TRIALING", trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        },
      },
      include: { subscription: true },
    });

    return successResponse(tenant, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

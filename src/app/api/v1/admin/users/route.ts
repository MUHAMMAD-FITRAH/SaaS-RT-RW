import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { hash } from "bcryptjs";
import { requireAuth, successResponse, errorResponse, handleApiError, getPaginationParams, paginatedResponse, AuthError } from "@/server/middleware/api-utils";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if ((session.user.role as UserRole) !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    const { page, limit, skip, search } = getPaginationParams(req);
    const url = new URL(req.url);
    const role = url.searchParams.get("role");
    const tenantId = url.searchParams.get("tenantId");

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (tenantId) where.tenantId = tenantId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          isActive: true, lastLoginAt: true, createdAt: true,
          tenant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return paginatedResponse(users, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if ((session.user.role as UserRole) !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    const body = await req.json();
    const { email, password, name, phone, role, tenantId } = body;

    if (!email || !password || !name || !role) {
      return errorResponse("Email, password, nama, dan role harus diisi", 400);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return errorResponse("Email sudah terdaftar", 400);

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email, password: hashedPassword, name, phone,
        role, tenantId: tenantId || null,
      },
      select: { id: true, name: true, email: true, role: true, tenantId: true },
    });

    return successResponse(user, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

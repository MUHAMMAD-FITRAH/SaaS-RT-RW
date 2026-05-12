import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Feature, canAccess } from "@/lib/features";
import { hasPermission } from "@/lib/permissions";
import { SubscriptionTier, UserRole } from "@prisma/client";

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function paginatedResponse(
  data: unknown[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function getAuthSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session;
}

export async function requireAuth() {
  const session = await getAuthSession();
  if (!session) {
    throw new AuthError("Unauthorized", 401);
  }
  return session;
}

export async function requirePermission(permission: string) {
  const session = await requireAuth();
  if (!hasPermission(session.user.role as UserRole, permission)) {
    throw new AuthError("Forbidden", 403);
  }
  return session;
}

export async function requireFeature(feature: Feature) {
  const session = await requireAuth();
  // SUPER_ADMIN bypasses all feature/tier restrictions
  if (session.user.role === "SUPER_ADMIN") return session;
  if (!canAccess(feature, session.user.tier as SubscriptionTier)) {
    throw new AuthError(
      `Fitur ini tidak tersedia di paket Anda. Silakan upgrade untuk mengakses.`,
      403
    );
  }
  return session;
}

/**
 * Returns tenant filter for Prisma queries.
 * SUPER_ADMIN gets empty filter (cross-tenant access).
 * Other roles get { tenantId } scoping.
 * Returns null if non-admin user has no tenantId.
 */
export function getTenantFilter(session: { user: { role: string; tenantId: string | null } }): { tenantId?: string } | null {
  if (session.user.role === "SUPER_ADMIN") return {};
  if (!session.user.tenantId) return null;
  return { tenantId: session.user.tenantId };
}

/**
 * Resolves tenantId for mutation operations (POST/PATCH/DELETE).
 * For SUPER_ADMIN: uses bodyTenantId if provided, otherwise fetches the first tenant.
 * For other roles: uses session tenantId.
 * Returns null if no tenantId can be resolved.
 */
export async function resolveTenantId(
  session: { user: { role: string; tenantId: string | null } },
  bodyTenantId?: string | null
): Promise<string | null> {
  if (session.user.tenantId) return session.user.tenantId;
  if (session.user.role === "SUPER_ADMIN") {
    if (bodyTenantId) return bodyTenantId;
    // Auto-select first tenant for SUPER_ADMIN
    const { default: prisma } = await import("@/lib/db");
    const firstTenant = await prisma.tenant.findFirst({ select: { id: true } });
    return firstTenant?.id || null;
  }
  return null;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    return errorResponse(error.message, error.status);
  }
  console.error("API Error:", error);
  return errorResponse("Internal server error", 500);
}

export function getPaginationParams(req: NextRequest) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const search = url.searchParams.get("search") || "";
  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
    skip: (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit)),
    search,
  };
}

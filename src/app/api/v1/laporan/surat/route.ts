import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, successResponse, errorResponse, handleApiError, getPaginationParams, paginatedResponse, AuthError } from "@/server/middleware/api-utils";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const role = session.user.role as UserRole;
    if (role !== "RT_ADMIN" && role !== "RW_ADMIN" && role !== "SUPER_ADMIN") {
      throw new AuthError("Forbidden", 403);
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const { page, limit, skip, search } = getPaginationParams(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { perihal: { contains: search, mode: "insensitive" } },
        { nomorSurat: { contains: search, mode: "insensitive" } },
      ];
    }

    const [suratList, total] = await Promise.all([
      prisma.surat.findMany({
        where,
        include: { warga: { select: { namaLengkap: true, nik: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.surat.count({ where }),
    ]);

    return paginatedResponse(suratList, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

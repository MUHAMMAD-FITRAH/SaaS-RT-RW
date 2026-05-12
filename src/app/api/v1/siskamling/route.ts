import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  paginatedResponse,
  handleApiError,
  getPaginationParams,
  resolveTenantId,
} from "@/server/middleware/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId && session.user.role !== "SUPER_ADMIN") return errorResponse("Tenant not found", 400);

    const { page, limit, skip, search } = getPaginationParams(req);

    const where: Record<string, unknown> = tenantId ? { tenantId } : {};
    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: "insensitive" } },
        { catatan: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.siskamling.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tanggal: "desc" },
      }),
      prisma.siskamling.count({ where }),
    ]);

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const tenantId = await resolveTenantId(session, body.tenantId);
    if (!tenantId) return errorResponse("Tenant not found", 400);

    if (!body.tanggal || !body.petugas || body.petugas.length === 0) {
      return errorResponse("Tanggal dan petugas wajib diisi", 422);
    }

    const siskamling = await prisma.siskamling.create({
      data: {
        tenantId,
        tanggal: new Date(body.tanggal),
        shift: body.shift || null,
        petugas: body.petugas,
        lokasi: body.lokasi || null,
        catatan: body.catatan || null,
        kejadian: body.kejadian || null,
      },
    });

    return successResponse(siskamling, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

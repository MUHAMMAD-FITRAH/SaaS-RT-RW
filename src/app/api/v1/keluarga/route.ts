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
import { keluargaSchema } from "@/lib/validators/warga";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId && session.user.role !== "SUPER_ADMIN") return errorResponse("Tenant not found", 400);

    const { page, limit, skip, search } = getPaginationParams(req);

    const where: Record<string, unknown> = tenantId ? { tenantId } : {};
    if (search) {
      where.OR = [
        { nomorKK: { contains: search } },
        { kepalaKeluarga: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.keluarga.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          rumah: { select: { nomorRumah: true, blok: true, alamat: true } },
          _count: { select: { anggota: true } },
        },
      }),
      prisma.keluarga.count({ where }),
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

    const parsed = keluargaSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join(", ");
      return errorResponse(errors, 422);
    }

    const existing = await prisma.keluarga.findUnique({
      where: { tenantId_nomorKK: { tenantId, nomorKK: parsed.data.nomorKK } },
    });

    if (existing) return errorResponse("Nomor KK sudah terdaftar", 409);

    const keluarga = await prisma.keluarga.create({
      data: { tenantId, ...parsed.data },
    });

    return successResponse(keluarga, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

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
import { rumahSchema } from "@/lib/validators/warga";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId && session.user.role !== "SUPER_ADMIN") return errorResponse("Tenant not found", 400);

    const { page, limit, skip, search } = getPaginationParams(req);

    const where: Record<string, unknown> = tenantId ? { tenantId } : {};
    if (search) {
      where.OR = [
        { nomorRumah: { contains: search, mode: "insensitive" } },
        { blok: { contains: search, mode: "insensitive" } },
        { alamat: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.rumah.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nomorRumah: "asc" },
        include: {
          _count: { select: { keluarga: true, kendaraan: true } },
        },
      }),
      prisma.rumah.count({ where }),
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

    const parsed = rumahSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join(", ");
      return errorResponse(errors, 422);
    }

    const rumah = await prisma.rumah.create({
      data: { tenantId, ...parsed.data },
    });

    return successResponse(rumah, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  paginatedResponse,
  handleApiError,
  getPaginationParams,
} from "@/server/middleware/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const { page, limit, skip, search } = getPaginationParams(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { judul: { contains: search, mode: "insensitive" } },
        { pengirim: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.keluhan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.keluhan.count({ where }),
    ]);

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const body = await req.json();

    if (!body.pengirim || !body.kategori || !body.judul || !body.isi) {
      return errorResponse("Pengirim, kategori, judul, dan isi wajib diisi", 422);
    }

    const keluhan = await prisma.keluhan.create({
      data: {
        tenantId,
        pengirim: body.pengirim,
        email: body.email || null,
        kategori: body.kategori,
        judul: body.judul,
        isi: body.isi,
        status: "BARU",
      },
    });

    return successResponse(keluhan, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

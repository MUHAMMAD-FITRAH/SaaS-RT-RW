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

    const where: Record<string, unknown> = { tenantId };
    if (search) {
      where.OR = [
        { judul: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.agenda.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tanggalMulai: "desc" },
      }),
      prisma.agenda.count({ where }),
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

    if (!body.judul || !body.tanggalMulai) {
      return errorResponse("Judul dan tanggal mulai wajib diisi", 422);
    }

    const agenda = await prisma.agenda.create({
      data: {
        tenantId,
        judul: body.judul,
        deskripsi: body.deskripsi || null,
        tanggalMulai: new Date(body.tanggalMulai),
        tanggalSelesai: body.tanggalSelesai ? new Date(body.tanggalSelesai) : null,
        lokasi: body.lokasi || null,
        foto: body.foto || [],
        isPublished: body.isPublished ?? false,
      },
    });

    return successResponse(agenda, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

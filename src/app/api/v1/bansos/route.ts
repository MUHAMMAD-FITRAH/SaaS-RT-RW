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
        { nama: { contains: search, mode: "insensitive" } },
        { sumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.bansos.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { recipients: true },
          },
        },
      }),
      prisma.bansos.count({ where }),
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

    if (!body.nama || !body.sumber || !body.tanggalMulai) {
      return errorResponse("Nama, sumber, dan tanggal mulai wajib diisi", 422);
    }

    const bansos = await prisma.bansos.create({
      data: {
        tenantId,
        nama: body.nama,
        sumber: body.sumber,
        deskripsi: body.deskripsi || null,
        tanggalMulai: new Date(body.tanggalMulai),
        tanggalSelesai: body.tanggalSelesai ? new Date(body.tanggalSelesai) : null,
        status: body.status || "AKTIF",
      },
    });

    return successResponse(bansos, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

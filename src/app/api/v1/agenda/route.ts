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

    const isAdmin = ["RT_ADMIN", "RW_ADMIN", "SUPER_ADMIN"].includes(session.user.role);

    const where: Record<string, unknown> = tenantId ? { tenantId } : {};
    // Non-admin (warga) only sees published agenda
    if (!isAdmin) where.isPublished = true;
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
    const body = await req.json();
    const tenantId = await resolveTenantId(session, body.tenantId);
    if (!tenantId) return errorResponse("Tenant not found", 400);

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

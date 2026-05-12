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
    const url      = new URL(req.url);
    const status   = url.searchParams.get("status")   || undefined;
    const kategori = url.searchParams.get("kategori") || undefined;

    const where: Record<string, unknown> = tenantId ? { tenantId } : {};
    if (status)   where.status   = status;
    if (kategori) where.kategori = kategori;

    // Resident sees only their own
    if (session.user.role === "RESIDENT") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { warga: { select: { id: true } } },
      });
      if (user?.warga) where.wargaId = user.warga.id;
    }

    if (search) {
      where.OR = [
        { judul:    { contains: search, mode: "insensitive" } },
        { pengirim: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.pengajuan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          warga: { select: { id: true, namaLengkap: true, nik: true } },
        },
      }),
      prisma.pengajuan.count({ where }),
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

    const { pengirim, kategori, judul, isi } = body;
    if (!pengirim || !kategori || !judul || !isi) {
      return errorResponse("Pengirim, kategori, judul, dan isi wajib diisi", 422);
    }

    // Resolve wargaId from session if resident
    let wargaId = body.wargaId ?? null;
    if (!wargaId && session.user.role === "RESIDENT") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { warga: { select: { id: true } } },
      });
      wargaId = user?.warga?.id ?? null;
    }

    const pengajuan = await prisma.pengajuan.create({
      data: {
        tenantId,
        wargaId:  wargaId || null,
        pengirim,
        kategori,
        judul,
        isi,
        status: "MENUNGGU",
      },
    });

    return successResponse(pengajuan, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

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
import { wargaSchema } from "@/lib/validators/warga";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const { page, limit, skip, search } = getPaginationParams(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.statusAktif = status;
    if (search) {
      where.OR = [
        { namaLengkap: { contains: search, mode: "insensitive" } },
        { nik: { contains: search } },
        { nomorHP: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.warga.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          keluarga: { select: { nomorKK: true, kepalaKeluarga: true, rumah: { select: { nomorRumah: true, blok: true } } } },
        },
      }),
      prisma.warga.count({ where }),
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
    const parsed = wargaSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join(", ");
      return errorResponse(errors, 422);
    }

    const existing = await prisma.warga.findUnique({
      where: { tenantId_nik: { tenantId, nik: parsed.data.nik } },
    });

    if (existing) {
      return errorResponse("NIK sudah terdaftar", 409);
    }

    const warga = await prisma.warga.create({
      data: {
        tenantId,
        ...parsed.data,
        tanggalLahir: parsed.data.tanggalLahir
          ? new Date(parsed.data.tanggalLahir)
          : null,
        email: parsed.data.email || null,
      },
    });

    return successResponse(warga, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

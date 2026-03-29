import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, successResponse, errorResponse, handleApiError, getPaginationParams, paginatedResponse } from "@/server/middleware/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    // Find linked warga
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { warga: true },
    });
    if (!user?.warga) return errorResponse("Data warga belum terhubung", 400);

    const { page, limit, skip } = getPaginationParams(req);

    const [suratList, total] = await Promise.all([
      prisma.surat.findMany({
        where: { tenantId, wargaId: user.warga.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.surat.count({ where: { tenantId, wargaId: user.warga.id } }),
    ]);

    return paginatedResponse(suratList, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { warga: true },
    });
    if (!user?.warga) return errorResponse("Data warga belum terhubung", 400);

    const body = await req.json();
    const { jenisSurat, perihal, isiSurat } = body;

    if (!jenisSurat || !perihal) {
      return errorResponse("Jenis surat dan perihal harus diisi", 400);
    }

    // Generate surat number
    const count = await prisma.surat.count({ where: { tenantId } });
    const nomorSurat = `${String(count + 1).padStart(4, "0")}/RT/III/${new Date().getFullYear()}`;

    const surat = await prisma.surat.create({
      data: {
        tenantId,
        wargaId: user.warga.id,
        nomorSurat,
        jenisSurat,
        perihal,
        isiSurat: isiSurat || "",
        status: "DIAJUKAN",
      },
    });

    return successResponse(surat, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
  paginatedResponse,
  resolveTenantId,
} from "@/server/middleware/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId && session.user.role !== "SUPER_ADMIN") return errorResponse("Tenant tidak ditemukan", 400);

    const { page, limit, skip, search } = getPaginationParams(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const jenis = url.searchParams.get("jenis");

    const where: Record<string, unknown> = tenantId ? { tenantId } : {};

    if (status) where.status = status;
    if (jenis) where.jenisSurat = jenis;

    if (search) {
      where.OR = [
        { nomorSurat: { contains: search, mode: "insensitive" } },
        { perihal: { contains: search, mode: "insensitive" } },
        { warga: { namaLengkap: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.surat.findMany({
        where,
        include: {
          warga: { select: { id: true, namaLengkap: true, nik: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.surat.count({ where }),
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
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const { wargaId, jenisSurat, perihal, isiSurat, catatan } = body;

    if (!jenisSurat || !perihal) {
      return errorResponse("Jenis surat dan perihal harus diisi", 400);
    }

    // Auto-generate nomor surat
    const count = await prisma.surat.count({ where: { tenantId } });
    const now = new Date();
    const nomorSurat = `${String(count + 1).padStart(3, "0")}/RT/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

    const surat = await prisma.surat.create({
      data: {
        tenantId,
        wargaId: wargaId || null,
        nomorSurat,
        jenisSurat,
        perihal,
        isiSurat: isiSurat || null,
        catatan: catatan || null,
      },
      include: {
        warga: { select: { id: true, namaLengkap: true } },
      },
    });

    return successResponse(surat, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const tenantId = await resolveTenantId(session, body.tenantId);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const { id, status, catatan, disetujuiOleh } = body;

    if (!id) return errorResponse("ID surat harus diisi", 400);

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === "DISETUJUI") {
        updateData.tanggalDisetujui = new Date();
        updateData.disetujuiOleh = disetujuiOleh || session.user.name;
      }
    }
    if (catatan !== undefined) updateData.catatan = catatan;

    const result = await prisma.surat.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (result.count === 0) return errorResponse("Surat tidak ditemukan", 404);

    return successResponse({ message: "Surat berhasil diupdate" });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = await resolveTenantId(session);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return errorResponse("ID surat harus diisi", 400);

    const result = await prisma.surat.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) return errorResponse("Surat tidak ditemukan", 404);

    return successResponse({ message: "Surat berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

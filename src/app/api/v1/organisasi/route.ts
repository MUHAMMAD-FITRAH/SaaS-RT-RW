import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/server/middleware/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("active") !== "false";

    const where: Record<string, unknown> = { tenantId };
    if (activeOnly) where.isActive = true;

    const data = await prisma.organisasi.findMany({
      where,
      orderBy: { urutan: "asc" },
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const body = await req.json();
    const { nama, jabatan, urutan, foto, nomorHP, periode, isActive } = body;

    if (!nama || !jabatan) {
      return errorResponse("Nama dan jabatan harus diisi", 400);
    }

    const organisasi = await prisma.organisasi.create({
      data: {
        tenantId,
        nama,
        jabatan,
        urutan: urutan ? parseInt(urutan) : 0,
        foto: foto || null,
        nomorHP: nomorHP || null,
        periode: periode || null,
        isActive: isActive !== false,
      },
    });

    return successResponse(organisasi, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

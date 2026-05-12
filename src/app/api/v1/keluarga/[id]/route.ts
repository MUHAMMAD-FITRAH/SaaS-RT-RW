import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/server/middleware/api-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const keluarga = await prisma.keluarga.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
      include: {
        rumah: true,
        anggota: { orderBy: { namaLengkap: "asc" } },
      },
    });

    if (!keluarga) return errorResponse("Keluarga tidak ditemukan", 404);
    return successResponse(keluarga);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const existing = await prisma.keluarga.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!existing) return errorResponse("Keluarga tidak ditemukan", 404);

    const body = await req.json();
    const keluarga = await prisma.keluarga.update({
      where: { id: params.id },
      data: body,
    });

    return successResponse(keluarga);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const existing = await prisma.keluarga.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!existing) return errorResponse("Keluarga tidak ditemukan", 404);

    await prisma.keluarga.delete({ where: { id: params.id } });
    return successResponse({ message: "Keluarga berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

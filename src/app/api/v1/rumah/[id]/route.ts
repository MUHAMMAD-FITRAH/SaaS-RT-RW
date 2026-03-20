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

    const rumah = await prisma.rumah.findFirst({
      where: { id: params.id, tenantId: tenantId! },
      include: {
        keluarga: {
          include: { anggota: { where: { statusAktif: "AKTIF" } } },
        },
        kendaraan: true,
      },
    });

    if (!rumah) return errorResponse("Rumah tidak ditemukan", 404);
    return successResponse(rumah);
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

    const existing = await prisma.rumah.findFirst({
      where: { id: params.id, tenantId: tenantId! },
    });
    if (!existing) return errorResponse("Rumah tidak ditemukan", 404);

    const body = await req.json();
    const rumah = await prisma.rumah.update({
      where: { id: params.id },
      data: body,
    });

    return successResponse(rumah);
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

    const existing = await prisma.rumah.findFirst({
      where: { id: params.id, tenantId: tenantId! },
    });
    if (!existing) return errorResponse("Rumah tidak ditemukan", 404);

    await prisma.rumah.delete({ where: { id: params.id } });
    return successResponse({ message: "Rumah berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

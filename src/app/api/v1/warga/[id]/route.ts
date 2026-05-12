import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/server/middleware/api-utils";
import { wargaSchema } from "@/lib/validators/warga";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const warga = await prisma.warga.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
      include: {
        keluarga: {
          include: { rumah: true },
        },
        iuranPayments: {
          orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
          take: 12,
          include: { iuranType: true },
        },
      },
    });

    if (!warga) return errorResponse("Warga tidak ditemukan", 404);

    return successResponse(warga);
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

    const body = await req.json();
    const parsed = wargaSchema.partial().safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join(", ");
      return errorResponse(errors, 422);
    }

    const existing = await prisma.warga.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });

    if (!existing) return errorResponse("Warga tidak ditemukan", 404);

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.tanggalLahir) {
      updateData.tanggalLahir = new Date(parsed.data.tanggalLahir);
    }
    if (parsed.data.email === "") {
      updateData.email = null;
    }

    const warga = await prisma.warga.update({
      where: { id: params.id },
      data: updateData,
    });

    return successResponse(warga);
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

    const existing = await prisma.warga.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });

    if (!existing) return errorResponse("Warga tidak ditemukan", 404);

    await prisma.warga.update({
      where: { id: params.id },
      data: { statusAktif: "TIDAK_AKTIF" },
    });

    return successResponse({ message: "Warga berhasil dinonaktifkan" });
  } catch (error) {
    return handleApiError(error);
  }
}

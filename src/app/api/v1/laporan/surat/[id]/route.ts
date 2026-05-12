import prisma from "@/lib/db";
import { requireAuth, successResponse, errorResponse, handleApiError, AuthError, resolveTenantId } from "@/server/middleware/api-utils";
import { UserRole } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const role = session.user.role as UserRole;
    if (role !== "RW_ADMIN" && role !== "SUPER_ADMIN" && role !== "RT_ADMIN") {
      throw new AuthError("Forbidden", 403);
    }

    const body = await req.json();
    const tenantId = await resolveTenantId(session, body.tenantId);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const { status, catatan } = body;

    if (!status || !["DIPROSES", "DISETUJUI", "DITOLAK"].includes(status)) {
      return errorResponse("Status tidak valid", 400);
    }

    const surat = await prisma.surat.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });

    if (!surat) return errorResponse("Surat tidak ditemukan", 404);

    const updated = await prisma.surat.update({
      where: { id: params.id },
      data: {
        status,
        catatan: catatan || surat.catatan,
        ...(status === "DISETUJUI" && {
          tanggalDisetujui: new Date(),
          disetujuiOleh: session.user.name,
        }),
      },
      include: { warga: { select: { namaLengkap: true } } },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

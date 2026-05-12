import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/server/middleware/api-utils";

// ─── GET /api/v1/agenda/[id] ──────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const agenda = await prisma.agenda.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });

    if (!agenda) return errorResponse("Agenda tidak ditemukan", 404);
    return successResponse(agenda);
  } catch (error) {
    return handleApiError(error);
  }
}

// ─── PATCH /api/v1/agenda/[id] ────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const role = session.user.role;
    if (!["RT_ADMIN", "RW_ADMIN", "SUPER_ADMIN"].includes(role)) {
      return errorResponse("Tidak diizinkan", 403);
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.judul !== undefined)         data.judul          = body.judul;
    if (body.deskripsi !== undefined)     data.deskripsi      = body.deskripsi || null;
    if (body.tanggalMulai !== undefined)  data.tanggalMulai   = new Date(body.tanggalMulai);
    if (body.tanggalSelesai !== undefined) data.tanggalSelesai = body.tanggalSelesai ? new Date(body.tanggalSelesai) : null;
    if (body.lokasi !== undefined)        data.lokasi         = body.lokasi || null;
    if (body.isPublished !== undefined)   data.isPublished    = Boolean(body.isPublished);

    const agenda = await prisma.agenda.update({
      where: { id: params.id },
      data,
    });

    return successResponse(agenda);
  } catch (error) {
    return handleApiError(error);
  }
}

// ─── DELETE /api/v1/agenda/[id] ───────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const role = session.user.role;
    if (!["RT_ADMIN", "RW_ADMIN", "SUPER_ADMIN"].includes(role)) {
      return errorResponse("Tidak diizinkan", 403);
    }

    await prisma.agenda.delete({ where: { id: params.id } });
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

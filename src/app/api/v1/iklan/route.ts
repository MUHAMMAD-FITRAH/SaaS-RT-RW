import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
  resolveTenantId,
} from "@/server/middleware/api-utils";

// Harga paket iklan (IDR)
const IKLAN_PAKET = {
  7:  10_000,
  14: 18_000,
  30: 30_000,
} as const;

export async function GET(req: NextRequest) {
  try {
    const session  = await requireAuth();
    const tenantId = session.user.tenantId;

    const url          = new URL(req.url);
    const usahaWargaId = url.searchParams.get("usahaWargaId") || undefined;

    const where: Record<string, unknown> = tenantId ? { tenantId } : {};
    if (usahaWargaId) where.usahaWargaId = usahaWargaId;

    const data = await prisma.iklanUsaha.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        usahaWarga: { select: { namaUsaha: true, pemilik: true } },
      },
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session  = await requireAuth();
    const body     = await req.json();
    const tenantId = await resolveTenantId(session, body.tenantId);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const { usahaWargaId, durasi, buktiPembayaran } = body;

    if (!usahaWargaId || !durasi) {
      return errorResponse("usahaWargaId dan durasi wajib diisi", 422);
    }

    const validDurasi = [7, 14, 30] as const;
    if (!validDurasi.includes(durasi)) {
      return errorResponse("Durasi harus 7, 14, atau 30 hari", 422);
    }

    const harga = IKLAN_PAKET[durasi as 7 | 14 | 30];

    const iklan = await prisma.iklanUsaha.create({
      data: {
        tenantId,
        usahaWargaId,
        durasi,
        harga,
        buktiPembayaran: buktiPembayaran || null,
        status: buktiPembayaran ? "MENUNGGU_BAYAR" : "MENUNGGU_BAYAR",
      },
    });

    return successResponse(iklan, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

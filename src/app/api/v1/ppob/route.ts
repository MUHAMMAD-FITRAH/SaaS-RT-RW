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
import { JenisPPOB, UserRole } from "@prisma/client";

// Admin fee per PPOB type (IDR)
const PPOB_ADMIN_FEE: Record<JenisPPOB, number> = {
  PLN:                  2500,
  PDAM:                 2500,
  PULSA:                1500,
  BPJS_KESEHATAN:       2000,
  BPJS_KETENAGAKERJAAN: 2000,
  INTERNET:             2500,
  TV_KABEL:             2500,
  LAINNYA:              1000,
};

const PPOB_LABEL: Record<JenisPPOB, string> = {
  PLN:                  "Token / Tagihan PLN",
  PDAM:                 "Tagihan PDAM",
  PULSA:                "Pulsa / Paket Data",
  BPJS_KESEHATAN:       "BPJS Kesehatan",
  BPJS_KETENAGAKERJAAN: "BPJS Ketenagakerjaan",
  INTERNET:             "Internet / IndiHome",
  TV_KABEL:             "TV Kabel",
  LAINNYA:              "Lainnya",
};

/**
 * GET /api/v1/ppob?status=&jenis=&page=&limit=
 * Admin: all orders in tenant.
 * Resident: only their own orders.
 */
export async function GET(req: NextRequest) {
  try {
    const session  = await requireAuth();
    const role     = session.user.role as UserRole;
    const tenantId = session.user.tenantId;

    const { page, limit, skip } = getPaginationParams(req);
    const url    = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const jenis  = url.searchParams.get("jenis")  || undefined;

    const where: Record<string, unknown> = tenantId ? { tenantId } : {};
    if (status) where.status = status;
    if (jenis)  where.jenis  = jenis;

    // Residents only see their own orders
    if (role === "RESIDENT") {
      const warga = await prisma.warga.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (warga) {
        where.wargaId = warga.id;
      } else {
        // Fallback: pemohon matches user name
        where.pemohon = { contains: session.user.name, mode: "insensitive" };
      }
    }

    const [data, total] = await Promise.all([
      prisma.pPOBOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          warga: { select: { namaLengkap: true, nomorHP: true } },
        },
      }),
      prisma.pPOBOrder.count({ where }),
    ]);

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/ppob
 * Body: { jenis, nomorTujuan, jumlah, pemohon? }
 */
export async function POST(req: NextRequest) {
  try {
    const session  = await requireAuth();
    const body     = await req.json();
    const tenantId = await resolveTenantId(session, body.tenantId);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const { jenis, nomorTujuan, jumlah, pemohon } = body;

    if (!jenis || !nomorTujuan || jumlah == null) {
      return errorResponse("jenis, nomorTujuan, dan jumlah wajib diisi", 422);
    }

    const validJenis = Object.values(JenisPPOB);
    if (!validJenis.includes(jenis as JenisPPOB)) {
      return errorResponse("Jenis PPOB tidak valid", 422);
    }

    const adminFee = PPOB_ADMIN_FEE[jenis as JenisPPOB];
    const total    = Number(jumlah) + adminFee;

    // Resolve wargaId from session
    let wargaId: string | null = null;
    const warga = await prisma.warga.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (warga) wargaId = warga.id;

    const order = await prisma.pPOBOrder.create({
      data: {
        tenantId,
        wargaId,
        pemohon:     (pemohon as string | undefined) || session.user.name || "Warga",
        jenis:       jenis as JenisPPOB,
        nomorTujuan: nomorTujuan as string,
        jumlah:      Number(jumlah),
        adminFee,
        total,
      },
    });

    return successResponse(order, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

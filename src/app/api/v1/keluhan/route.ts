import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  paginatedResponse,
  handleApiError,
  getPaginationParams,
  resolveTenantId,
} from "@/server/middleware/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId && session.user.role !== "SUPER_ADMIN") return errorResponse("Tenant not found", 400);

    const { page, limit, skip, search } = getPaginationParams(req);
    const url = new URL(req.url);
    const status    = url.searchParams.get("status")    || undefined;
    const kategori  = url.searchParams.get("kategori")  || undefined;
    const isUrgent  = url.searchParams.get("isUrgent");
    const myOnly    = url.searchParams.get("my") === "1"; // RESIDENT: only own

    const where: Record<string, unknown> = tenantId ? { tenantId } : {};
    if (status)   where.status = status;
    if (kategori) where.kategori = kategori;
    if (isUrgent === "1") where.isUrgent = true;

    // Resident sees only their own
    if (session.user.role === "RESIDENT" || myOnly) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { warga: { select: { id: true } } },
      });
      if (user?.warga) where.wargaId = user.warga.id;
    }

    if (search) {
      where.OR = [
        { judul:    { contains: search, mode: "insensitive" } },
        { pengirim: { contains: search, mode: "insensitive" } },
        { isi:      { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.keluhan.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isUrgent: "desc" }, { createdAt: "desc" }],
        include: {
          warga: { select: { id: true, namaLengkap: true, nik: true } },
        },
      }),
      prisma.keluhan.count({ where }),
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
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const { pengirim, email, kategori, judul, isi, fotoUrl, latitude, longitude, isUrgent, force } = body;

    if (!pengirim || !kategori || !judul || !isi) {
      return errorResponse("Pengirim, kategori, judul, dan isi wajib diisi", 422);
    }

    // ── Duplikat check: same judul (case-insensitive) within last 7 days ──────
    if (!force) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const duplikat = await prisma.keluhan.findFirst({
        where: {
          tenantId,
          judul: { equals: judul.trim(), mode: "insensitive" },
          createdAt: { gte: sevenDaysAgo },
        },
        select: { id: true, judul: true, status: true, createdAt: true },
      });
      if (duplikat) {
        return successResponse(
          { duplicate: true, existing: duplikat },
          200,
        );
      }
    }

    // Resolve wargaId from session if resident
    let wargaId = body.wargaId ?? null;
    if (!wargaId && session.user.role === "RESIDENT") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { warga: { select: { id: true } } },
      });
      wargaId = user?.warga?.id ?? null;
    }

    const keluhan = await prisma.keluhan.create({
      data: {
        tenantId,
        wargaId:   wargaId  || null,
        pengirim,
        email:     email    || null,
        kategori,
        judul,
        isi,
        fotoUrl:   fotoUrl  || null,
        latitude:  latitude  != null ? Number(latitude)  : null,
        longitude: longitude != null ? Number(longitude) : null,
        isUrgent:  isUrgent === true || isUrgent === "true",
        status: "BARU",
      },
    });

    return successResponse(keluhan, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

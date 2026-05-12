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

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId && session.user.role !== "SUPER_ADMIN") return errorResponse("Tenant not found", 400);

    const { page, limit, skip, search } = getPaginationParams(req);
    const url         = new URL(req.url);
    const isPublished = url.searchParams.get("isPublished");
    const kategori    = url.searchParams.get("kategori") || undefined;
    const myOnly      = url.searchParams.get("my") === "1";

    const where: Record<string, unknown> = tenantId ? { tenantId } : {};

    // Residents only see published by default (unless they request their own)
    if (session.user.role === "RESIDENT" && !myOnly) {
      where.isPublished = true;
    } else if (isPublished !== null && isPublished !== "") {
      where.isPublished = isPublished === "true";
    }

    if (kategori) where.kategori = kategori;

    if (myOnly && session.user.role === "RESIDENT") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { warga: { select: { id: true } } },
      });
      if (user?.warga) where.wargaId = user.warga.id;
    }

    if (search) {
      where.OR = [
        { judul:    { contains: search, mode: "insensitive" } },
        { ringkasan: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.berita.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        include: {
          warga: { select: { id: true, namaLengkap: true } },
        },
      }),
      prisma.berita.count({ where }),
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

    const { judul, konten, ringkasan, gambar, kategori, penulis, isPublished } = body;

    if (!judul || !konten) {
      return errorResponse("Judul dan konten wajib diisi", 422);
    }

    const baseSlug = generateSlug(judul);
    const slug     = `${baseSlug}-${Date.now().toString(36)}`;

    // Residents submit as draft (isPublished: false always)
    const publish = session.user.role === "RESIDENT" ? false : (isPublished ?? false);

    // Resolve wargaId
    let wargaId = body.wargaId ?? null;
    if (!wargaId && session.user.role === "RESIDENT") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { warga: { select: { id: true } } },
      });
      wargaId = user?.warga?.id ?? null;
    }

    const resolvedPenulis = penulis || session.user.name || "Anonim";

    const berita = await prisma.berita.create({
      data: {
        tenantId,
        wargaId:     wargaId || null,
        judul,
        slug,
        konten,
        ringkasan:   ringkasan || null,
        gambar:      gambar    || null,
        kategori:    kategori  || null,
        penulis:     resolvedPenulis,
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
      },
    });

    return successResponse(berita, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

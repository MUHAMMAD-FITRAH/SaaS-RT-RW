import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  paginatedResponse,
  handleApiError,
  getPaginationParams,
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
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const { page, limit, skip, search } = getPaginationParams(req);
    const url = new URL(req.url);
    const isPublished = url.searchParams.get("isPublished");

    const where: Record<string, unknown> = { tenantId };
    if (isPublished !== null && isPublished !== "") {
      where.isPublished = isPublished === "true";
    }
    if (search) {
      where.OR = [
        { judul: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.berita.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const body = await req.json();

    if (!body.judul || !body.konten || !body.penulis) {
      return errorResponse("Judul, konten, dan penulis wajib diisi", 422);
    }

    const baseSlug = generateSlug(body.judul);
    const timestamp = Date.now().toString(36);
    const slug = `${baseSlug}-${timestamp}`;

    const berita = await prisma.berita.create({
      data: {
        tenantId,
        judul: body.judul,
        slug,
        konten: body.konten,
        ringkasan: body.ringkasan || null,
        gambar: body.gambar || null,
        penulis: body.penulis,
        isPublished: body.isPublished ?? false,
        publishedAt: body.isPublished ? new Date() : null,
      },
    });

    return successResponse(berita, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

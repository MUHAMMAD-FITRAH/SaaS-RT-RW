import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  handleApiError,
  getPaginationParams,
  paginatedResponse,
} from "@/server/middleware/api-utils";

/**
 * GET /api/v1/marketplace
 * Returns products from ALL tenants where usahaWarga.isMarketplace = true.
 * Lintas-RT — visible to all logged-in users across any tenant.
 * Supports: search, kategori, jenis (usaha type), tenantId (filter by RT)
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth(); // any logged-in user

    const { page, limit, skip, search } = getPaginationParams(req);
    const url      = new URL(req.url);
    const kategori = url.searchParams.get("kategori") || undefined;
    const jenis    = url.searchParams.get("jenis")    || undefined;
    const tenantId = url.searchParams.get("tenantId") || undefined;

    // Only products that are available AND from marketplace-opted-in, active businesses
    const productWhere: Record<string, unknown> = {
      isAvailable: true,
      usahaWarga: {
        isMarketplace: true,
        isActive: true,
        ...(tenantId && { tenantId }),
        ...(jenis    && { jenis: { contains: jenis, mode: "insensitive" } }),
      },
    };

    if (kategori) productWhere.kategori = kategori;

    if (search) {
      productWhere.OR = [
        { nama:        { contains: search, mode: "insensitive" } },
        { deskripsi:   { contains: search, mode: "insensitive" } },
        { usahaWarga:  { namaUsaha: { contains: search, mode: "insensitive" } } },
        { usahaWarga:  { pemilik:   { contains: search, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where: productWhere,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          usahaWarga: {
            select: {
              id: true,
              namaUsaha: true,
              pemilik: true,
              jenis: true,
              nomorHP: true,
              alamat: true,
              foto: true,
              tenantId: true,
              iklan: {
                where: {
                  status: "AKTIF",
                  mulaiTayang: { lte: new Date() },
                  selesaiTayang: { gte: new Date() },
                },
                select: { id: true, selesaiTayang: true },
                take: 1,
              },
              tenant: {
                select: { name: true, rtNumber: true, rwNumber: true, kota: true },
              },
            },
          },
        },
      }),
      prisma.product.count({ where: productWhere }),
    ]);

    // Annotate with isFeatured (has active iklan)
    const annotated = data.map((p) => ({
      ...p,
      isFeatured: p.usahaWarga.iklan.length > 0,
      usahaWarga: {
        ...p.usahaWarga,
        iklan: undefined, // strip from response
      },
    }));

    return paginatedResponse(annotated, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

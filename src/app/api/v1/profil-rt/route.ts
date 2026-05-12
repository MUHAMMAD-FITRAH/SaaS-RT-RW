import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
  AuthError,
} from "@/server/middleware/api-utils";
import { UserRole } from "@prisma/client";

/**
 * GET /api/v1/profil-rt
 * Returns tenant info + organisasi list for the current user's tenant.
 * Accessible by all roles within the tenant.
 */
export async function GET() {
  try {
    const session  = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const [tenant, organisasi] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true, name: true, slug: true,
          rtNumber: true, rwNumber: true,
          kelurahan: true, kecamatan: true, kota: true, provinsi: true,
          address: true, phone: true, email: true, logo: true,
          isActive: true,
        },
      }),
      prisma.organisasi.findMany({
        where: { tenantId },
        orderBy: { urutan: "asc" },
      }),
    ]);

    if (!tenant) return errorResponse("Tenant tidak ditemukan", 404);

    return successResponse({ tenant, organisasi });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/v1/profil-rt
 * Update tenant profile. RT_ADMIN and SUPER_ADMIN only.
 * Accepts: name, rtNumber, rwNumber, kelurahan, kecamatan, kota, provinsi,
 *          address, phone, email, logo.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session  = await requireAuth();
    const role     = session.user.role as UserRole;
    const tenantId = session.user.tenantId;

    if (role !== "RT_ADMIN" && role !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 400);

    const body = await req.json();
    const {
      name, rtNumber, rwNumber, kelurahan, kecamatan, kota, provinsi,
      address, phone, email, logo,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (name      !== undefined) updateData.name      = name;
    if (rtNumber  !== undefined) updateData.rtNumber  = rtNumber;
    if (rwNumber  !== undefined) updateData.rwNumber  = rwNumber;
    if (kelurahan !== undefined) updateData.kelurahan = kelurahan || null;
    if (kecamatan !== undefined) updateData.kecamatan = kecamatan || null;
    if (kota      !== undefined) updateData.kota      = kota      || null;
    if (provinsi  !== undefined) updateData.provinsi  = provinsi  || null;
    if (address   !== undefined) updateData.address   = address   || null;
    if (phone     !== undefined) updateData.phone     = phone     || null;
    if (email     !== undefined) updateData.email     = email     || null;
    if (logo      !== undefined) updateData.logo      = logo      || null;

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data:  updateData,
      select: {
        id: true, name: true, rtNumber: true, rwNumber: true,
        kelurahan: true, kecamatan: true, kota: true, provinsi: true,
        address: true, phone: true, email: true, logo: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

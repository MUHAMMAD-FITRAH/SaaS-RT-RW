import prisma from "@/lib/db";
import { requireAuth, successResponse, errorResponse, handleApiError, AuthError } from "@/server/middleware/api-utils";
import { UserRole } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if ((session.user.role as UserRole) !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: {
        subscription: true,
        users: { select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true } },
        _count: { select: { warga: true, rumah: true, keluarga: true } },
      },
    });

    if (!tenant) return errorResponse("Tenant tidak ditemukan", 404);
    return successResponse(tenant);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if ((session.user.role as UserRole) !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    const body = await req.json();
    const { name, isActive, phone, email } = body;

    const updated = await prisma.tenant.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
      },
      include: { subscription: true },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if ((session.user.role as UserRole) !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    // Soft delete - deactivate
    const updated = await prisma.tenant.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return successResponse({ id: updated.id, isActive: updated.isActive });
  } catch (error) {
    return handleApiError(error);
  }
}

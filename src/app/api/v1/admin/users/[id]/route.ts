import prisma from "@/lib/db";
import { hash } from "bcryptjs";
import { requireAuth, successResponse, errorResponse, handleApiError, AuthError } from "@/server/middleware/api-utils";
import { UserRole } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if ((session.user.role as UserRole) !== "SUPER_ADMIN") throw new AuthError("Forbidden", 403);

    const body = await req.json();
    const { name, email, phone, role, isActive, password, tenantId } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    if (tenantId !== undefined) data.tenantId = tenantId || null;
    if (password) data.password = await hash(password, 12);

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, isActive: true, tenantId: true,
        tenant: { select: { name: true } },
      },
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

    if (params.id === session.user.id) {
      return errorResponse("Tidak dapat menghapus akun sendiri", 400);
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return successResponse({ id: updated.id, isActive: updated.isActive });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/server/middleware/api-utils";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/v1/upload
 * FormData fields:
 *   file      — File object
 *   type      — "avatar" | "warga" | "bukti" | "kas"
 *   targetId  — (optional) ID of warga to update when type="warga"
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) ?? "misc";
    const targetId = formData.get("targetId") as string | null;

    if (!file) return errorResponse("File tidak ditemukan", 400);
    if (!ALLOWED_TYPES.includes(file.type))
      return errorResponse("Format file harus JPG, PNG, atau WebP", 422);
    if (file.size > MAX_SIZE)
      return errorResponse("Ukuran file maksimal 5MB", 422);

    // Generate safe filename
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const dir = join(process.cwd(), "public", "uploads", type);

    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));

    const url = `/uploads/${type}/${filename}`;

    // Update relevant DB record
    if (type === "warga" && targetId) {
      // Verify warga belongs to this tenant (or super admin)
      const warga = await prisma.warga.findFirst({
        where: {
          id: targetId,
          ...(session.user.role !== "SUPER_ADMIN" && session.user.tenantId
            ? { tenantId: session.user.tenantId }
            : {}),
        },
      });
      if (!warga) return errorResponse("Warga tidak ditemukan", 404);

      await prisma.warga.update({
        where: { id: targetId },
        data: { foto: url },
      });
    } else if (type === "avatar") {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { avatar: url },
      });
    }

    return successResponse({ url });
  } catch (error) {
    return handleApiError(error);
  }
}

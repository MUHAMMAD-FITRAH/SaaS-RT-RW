import { NextRequest } from "next/server";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
  AuthError,
} from "@/server/middleware/api-utils";
import { UserRole } from "@prisma/client";
import {
  sendEmail,
  sendSuratNotification,
  sendIuranReminder,
  sendKeluhanResponse,
  sendWelcomeEmail,
} from "@/lib/email";

const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "RT_ADMIN", "RW_ADMIN"];

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!ADMIN_ROLES.includes(session.user.role as UserRole)) {
      throw new AuthError("Forbidden", 403);
    }

    const body = await req.json();
    const { type, to, data } = body;

    if (!type || !to) {
      return errorResponse("Field 'type' dan 'to' harus diisi", 400);
    }

    let result;

    switch (type) {
      case "generic": {
        const { subject, html } = data ?? {};
        if (!subject || !html) {
          return errorResponse("Field 'subject' dan 'html' harus diisi untuk tipe generic", 400);
        }
        result = await sendEmail({ to, subject, html });
        break;
      }

      case "surat": {
        const { namaWarga, nomorSurat, jenisSurat, status } = data ?? {};
        if (!namaWarga || !nomorSurat || !jenisSurat || !status) {
          return errorResponse("Field namaWarga, nomorSurat, jenisSurat, dan status harus diisi", 400);
        }
        result = await sendSuratNotification({ to, namaWarga, nomorSurat, jenisSurat, status });
        break;
      }

      case "iuran": {
        const { namaWarga, iuranType, jumlah, bulan, tahun } = data ?? {};
        if (!namaWarga || !iuranType || !jumlah || !bulan || !tahun) {
          return errorResponse("Field namaWarga, iuranType, jumlah, bulan, dan tahun harus diisi", 400);
        }
        result = await sendIuranReminder({ to, namaWarga, iuranType, jumlah, bulan, tahun });
        break;
      }

      case "keluhan": {
        const { namaWarga, judul, tanggapan } = data ?? {};
        if (!namaWarga || !judul || !tanggapan) {
          return errorResponse("Field namaWarga, judul, dan tanggapan harus diisi", 400);
        }
        result = await sendKeluhanResponse({ to, namaWarga, judul, tanggapan });
        break;
      }

      case "welcome": {
        const { name, tenantName } = data ?? {};
        if (!name || !tenantName) {
          return errorResponse("Field name dan tenantName harus diisi", 400);
        }
        result = await sendWelcomeEmail({ to, name, tenantName });
        break;
      }

      default:
        return errorResponse(
          `Tipe email '${type}' tidak dikenali. Gunakan: generic, surat, iuran, keluhan, welcome`,
          400,
        );
    }

    return successResponse({ message: "Email berhasil dikirim", ...result });
  } catch (error) {
    return handleApiError(error);
  }
}

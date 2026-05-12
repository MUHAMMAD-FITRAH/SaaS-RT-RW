import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/db";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/server/middleware/api-utils";

/**
 * GET /api/v1/auth/register-warga?nik=xxxx
 * Cek apakah NIK terdaftar dan belum punya akun (untuk auto-fill nama).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const nik = searchParams.get("nik")?.trim();

    if (!nik || nik.length !== 16 || !/^\d+$/.test(nik))
      return errorResponse("NIK harus 16 digit angka", 422);

    const warga = await prisma.warga.findFirst({
      where: { nik },
      select: {
        namaLengkap: true,
        userId: true,
        statusAktif: true,
        tenant: {
          select: { name: true, rtNumber: true, rwNumber: true, kelurahan: true },
        },
      },
    });

    if (!warga)
      return errorResponse(
        "NIK tidak ditemukan dalam sistem. Pastikan data Anda sudah didaftarkan oleh pengurus RT.",
        404
      );

    if (warga.userId)
      return errorResponse(
        "NIK ini sudah memiliki akun. Silakan login atau gunakan lupa password.",
        409
      );

    if (warga.statusAktif !== "AKTIF")
      return errorResponse("Status warga tidak aktif. Hubungi pengurus RT.", 403);

    return successResponse({
      namaLengkap: warga.namaLengkap,
      rt: `RT ${warga.tenant.rtNumber} / RW ${warga.tenant.rwNumber}${
        warga.tenant.kelurahan ? ` ${warga.tenant.kelurahan}` : ""
      }`,
      tenantName: warga.tenant.name,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/auth/register-warga
 * Daftarkan akun warga berdasarkan NIK.
 * Body: { nik, email, password, name? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nik, email, password, name } = body as {
      nik: string;
      email: string;
      password: string;
      name?: string;
    };

    // Validasi input
    if (!nik || !email || !password)
      return errorResponse("NIK, email, dan password wajib diisi", 422);
    if (nik.length !== 16 || !/^\d+$/.test(nik))
      return errorResponse("NIK harus 16 digit angka", 422);
    if (password.length < 8)
      return errorResponse("Password minimal 8 karakter", 422);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return errorResponse("Format email tidak valid", 422);

    // Cari warga berdasarkan NIK
    const warga = await prisma.warga.findFirst({
      where: { nik },
      include: {
        keluarga: true,
        tenant: { include: { subscription: true } },
      },
    });

    if (!warga)
      return errorResponse(
        "NIK tidak ditemukan dalam sistem. Pastikan data Anda sudah didaftarkan oleh pengurus RT.",
        404
      );

    if (warga.userId)
      return errorResponse(
        "NIK ini sudah memiliki akun terdaftar. Silakan login.",
        409
      );

    if (warga.statusAktif !== "AKTIF")
      return errorResponse("Status warga tidak aktif. Hubungi pengurus RT.", 403);

    // Cek email belum dipakai
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail)
      return errorResponse("Email sudah digunakan oleh akun lain.", 409);

    const hashedPassword = await hash(password, 12);

    // Buat akun user terhubung ke warga dan keluarga
    const user = await prisma.user.create({
      data: {
        name: name?.trim() || warga.namaLengkap,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: "RESIDENT",
        tenantId: warga.tenantId,
        keluargaId: warga.keluargaId ?? undefined,
      },
    });

    // Hubungkan warga ke user yang baru dibuat
    await prisma.warga.update({
      where: { id: warga.id },
      data: { userId: user.id },
    });

    return successResponse(
      {
        message: "Akun berhasil dibuat. Silakan login.",
        tenantName: warga.tenant.name,
        namaLengkap: warga.namaLengkap,
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

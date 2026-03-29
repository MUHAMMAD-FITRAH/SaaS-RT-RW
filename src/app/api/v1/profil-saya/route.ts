import prisma from "@/lib/db";
import { requireAuth, successResponse, errorResponse, handleApiError } from "@/server/middleware/api-utils";

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        warga: {
          include: {
            keluarga: { include: { rumah: true } },
          },
        },
        tenant: true,
      },
    });

    if (!user) return errorResponse("User tidak ditemukan", 404);

    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      lastLoginAt: user.lastLoginAt,
      tenant: user.tenant ? {
        name: user.tenant.name,
        rtNumber: user.tenant.rtNumber,
        rwNumber: user.tenant.rwNumber,
        kelurahan: user.tenant.kelurahan,
        kecamatan: user.tenant.kecamatan,
        kota: user.tenant.kota,
      } : null,
      warga: user.warga ? {
        nik: user.warga.nik,
        namaLengkap: user.warga.namaLengkap,
        tempatLahir: user.warga.tempatLahir,
        tanggalLahir: user.warga.tanggalLahir,
        jenisKelamin: user.warga.jenisKelamin,
        agama: user.warga.agama,
        statusPerkawinan: user.warga.statusPerkawinan,
        pekerjaan: user.warga.pekerjaan,
        pendidikan: user.warga.pendidikan,
        nomorHP: user.warga.nomorHP,
        statusTinggal: user.warga.statusTinggal,
        statusAktif: user.warga.statusAktif,
        keluarga: user.warga.keluarga ? {
          nomorKK: user.warga.keluarga.nomorKK,
          kepalaKeluarga: user.warga.keluarga.kepalaKeluarga,
          rumah: user.warga.keluarga.rumah ? {
            nomorRumah: user.warga.keluarga.rumah.nomorRumah,
            blok: user.warga.keluarga.rumah.blok,
            alamat: user.warga.keluarga.rumah.alamat,
          } : null,
        } : null,
      } : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { phone, avatar } = body;

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(phone !== undefined && { phone }),
        ...(avatar !== undefined && { avatar }),
      },
      select: { id: true, name: true, email: true, phone: true, avatar: true },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

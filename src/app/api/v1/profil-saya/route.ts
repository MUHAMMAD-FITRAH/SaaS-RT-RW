import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/server/middleware/api-utils";

export async function GET() {
  try {
    const session = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        warga: {
          include: {
            keluarga: {
              include: {
                rumah: true,
                anggota: {
                  select: {
                    id: true,
                    namaLengkap: true,
                    nik: true,
                    jenisKelamin: true,
                    tanggalLahir: true,
                    statusPerkawinan: true,
                    pekerjaan: true,
                    statusAktif: true,
                    foto: true,
                    userId: true,
                  },
                  orderBy: { namaLengkap: "asc" },
                },
              },
            },
          },
        },
        tenant: true,
      },
    });

    if (!user) return errorResponse("User tidak ditemukan", 404);

    const w = user.warga;
    const kk = w?.keluarga;

    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      keluargaId: user.keluargaId,
      lastLoginAt: user.lastLoginAt,

      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            rtNumber: user.tenant.rtNumber,
            rwNumber: user.tenant.rwNumber,
            kelurahan: user.tenant.kelurahan,
            kecamatan: user.tenant.kecamatan,
            kota: user.tenant.kota,
            provinsi: user.tenant.provinsi,
            address: user.tenant.address,
            phone: user.tenant.phone,
          }
        : null,

      warga: w
        ? {
            id: w.id,
            nik: w.nik,
            namaLengkap: w.namaLengkap,
            foto: w.foto,
            tempatLahir: w.tempatLahir,
            tanggalLahir: w.tanggalLahir,
            jenisKelamin: w.jenisKelamin,
            golonganDarah: w.golonganDarah,
            agama: w.agama,
            statusPerkawinan: w.statusPerkawinan,
            pekerjaan: w.pekerjaan,
            pendidikan: w.pendidikan,
            kewarganegaraan: w.kewarganegaraan,
            nomorHP: w.nomorHP,
            email: w.email,
            statusTinggal: w.statusTinggal,
            statusAktif: w.statusAktif,
          }
        : null,

      keluarga: kk
        ? {
            id: kk.id,
            nomorKK: kk.nomorKK,
            kepalaKeluarga: kk.kepalaKeluarga,
            rumah: kk.rumah
              ? {
                  id: kk.rumah.id,
                  nomorRumah: kk.rumah.nomorRumah,
                  blok: kk.rumah.blok,
                  alamat: kk.rumah.alamat,
                  rt: kk.rumah.rt,
                  rw: kk.rumah.rw,
                  statusHuni: kk.rumah.statusHuni,
                }
              : null,
            anggota: kk.anggota.map((a) => ({
              id: a.id,
              namaLengkap: a.namaLengkap,
              nik: a.nik,
              jenisKelamin: a.jenisKelamin,
              tanggalLahir: a.tanggalLahir,
              statusPerkawinan: a.statusPerkawinan,
              pekerjaan: a.pekerjaan,
              statusAktif: a.statusAktif,
              foto: a.foto,
              sudahPunyaAkun: !!a.userId,
            })),
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { phone, avatar, name } = body;

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(phone !== undefined && { phone }),
        ...(avatar !== undefined && { avatar }),
        ...(name  !== undefined && { name }),
      },
      select: { id: true, name: true, email: true, phone: true, avatar: true },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

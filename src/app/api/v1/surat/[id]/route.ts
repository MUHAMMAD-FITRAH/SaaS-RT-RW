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
 * GET /api/v1/surat/[id]
 * Returns full surat + warga (all fields) + tenant + keluarga.rumah for address.
 * Accessible by RT_ADMIN, RW_ADMIN, SUPER_ADMIN, and the owner RESIDENT.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const role = session.user.role as UserRole;
    const tenantId = session.user.tenantId;

    const surat = await prisma.surat.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
      include: {
        warga: {
          include: {
            keluarga: {
              include: {
                rumah: { select: { nomorRumah: true, blok: true, alamat: true, rt: true, rw: true } },
              },
            },
          },
        },
        tenant: {
          select: {
            name: true, rtNumber: true, rwNumber: true,
            kelurahan: true, kecamatan: true, kota: true, provinsi: true,
            phone: true, logo: true, address: true,
          },
        },
      },
    });

    if (!surat) return errorResponse("Surat tidak ditemukan", 404);

    // RESIDENT can only access their own surat (and only if DISETUJUI for printing)
    if (role === "RESIDENT") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { warga: true },
      });
      if (!user?.warga || user.warga.id !== surat.wargaId) {
        throw new AuthError("Forbidden", 403);
      }
    }

    // Assemble warga data with address from keluarga.rumah
    const w = surat.warga;
    const rumah = w?.keluarga?.rumah;
    const alamat = rumah?.alamat ?? null;
    const alamatBlok = rumah?.blok ? `Blok ${rumah.blok} No.${rumah.nomorRumah}` : rumah ? `No. ${rumah.nomorRumah}` : null;

    return successResponse({
      id: surat.id,
      nomorSurat: surat.nomorSurat,
      jenisSurat: surat.jenisSurat,
      perihal: surat.perihal,
      isiSurat: surat.isiSurat,
      catatan: surat.catatan,
      status: surat.status,
      tanggalSurat: surat.tanggalSurat,
      tanggalDisetujui: surat.tanggalDisetujui,
      disetujuiOleh: surat.disetujuiOleh,
      tandaTangan: surat.tandaTangan,
      fileUrl: surat.fileUrl,
      tenant: surat.tenant,
      warga: w
        ? {
            id: w.id,
            namaLengkap: w.namaLengkap,
            nik: w.nik,
            foto: w.foto,
            tempatLahir: w.tempatLahir,
            tanggalLahir: w.tanggalLahir,
            jenisKelamin: w.jenisKelamin,
            agama: w.agama,
            statusPerkawinan: w.statusPerkawinan,
            pekerjaan: w.pekerjaan,
            pendidikan: w.pendidikan,
            kewarganegaraan: w.kewarganegaraan,
            nomorHP: w.nomorHP,
            // Assembled address
            alamat: alamat ?? alamatBlok,
            rt: rumah?.rt ?? null,
            rw: rumah?.rw ?? null,
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/v1/surat/[id]
 * Admin: update status, catatan, disetujuiOleh.
 * Sets tanggalDisetujui when status → DISETUJUI.
 * Also handles generating final nomor surat on approval.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const role = session.user.role as UserRole;
    const tenantId = session.user.tenantId;

    if (role !== "RT_ADMIN" && role !== "RW_ADMIN" && role !== "SUPER_ADMIN") {
      throw new AuthError("Forbidden", 403);
    }

    const body = await req.json();
    const { status, catatan, disetujuiOleh } = body;

    const surat = await prisma.surat.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!surat) return errorResponse("Surat tidak ditemukan", 404);

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === "DISETUJUI") {
        updateData.tanggalDisetujui = new Date();
        updateData.disetujuiOleh = disetujuiOleh ?? session.user.name;

        // Re-generate nomor surat with Roman month on approval
        const now = new Date();
        const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
        const count = await prisma.surat.count({
          where: { tenantId: surat.tenantId, status: "DISETUJUI" },
        });
        const tenant = await prisma.tenant.findUnique({
          where: { id: surat.tenantId },
          select: { rtNumber: true, rwNumber: true },
        });
        if (tenant) {
          updateData.nomorSurat = `${String(count + 1).padStart(3, "0")}/RT.${tenant.rtNumber}/RW.${tenant.rwNumber}/${ROMAN[now.getMonth()]}/${now.getFullYear()}`;
        }
      }
    }
    if (catatan !== undefined) updateData.catatan = catatan;

    const updated = await prisma.surat.update({
      where: { id: params.id },
      data: updateData,
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/v1/surat/[id]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const role = session.user.role as UserRole;
    const tenantId = session.user.tenantId;

    if (role !== "RT_ADMIN" && role !== "SUPER_ADMIN") {
      throw new AuthError("Forbidden", 403);
    }

    const deleted = await prisma.surat.deleteMany({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (deleted.count === 0) return errorResponse("Surat tidak ditemukan", 404);

    return successResponse({ message: "Surat berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

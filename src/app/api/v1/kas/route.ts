import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleApiError,
  getPaginationParams,
  paginatedResponse,
  AuthError,
} from "@/server/middleware/api-utils";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const role = session.user.role as UserRole;
    if (role !== "RT_ADMIN" && role !== "RW_ADMIN" && role !== "SUPER_ADMIN") {
      throw new AuthError("Forbidden", 403);
    }
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const { page, limit, skip, search } = getPaginationParams(req);
    const url = new URL(req.url);
    const jenis = url.searchParams.get("jenis") || undefined;
    const kategori = url.searchParams.get("kategori") || undefined;

    const where: Record<string, unknown> = { tenantId };
    if (jenis) where.jenis = jenis;
    if (kategori) where.kategori = { contains: kategori, mode: "insensitive" };
    if (search) {
      where.OR = [
        { keterangan: { contains: search, mode: "insensitive" } },
        { kategori: { contains: search, mode: "insensitive" } },
        { pencatat: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total, aggregates] = await Promise.all([
      prisma.kasTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tanggal: "desc" },
      }),
      prisma.kasTransaction.count({ where }),
      prisma.kasTransaction.groupBy({
        by: ["jenis"],
        where: { tenantId },
        _sum: { jumlah: true },
      }),
    ]);

    let totalMasuk = 0;
    let totalKeluar = 0;
    for (const agg of aggregates) {
      if (agg.jenis === "MASUK") totalMasuk = Number(agg._sum.jumlah || 0);
      if (agg.jenis === "KELUAR") totalKeluar = Number(agg._sum.jumlah || 0);
    }
    const saldo = totalMasuk - totalKeluar;

    return new Response(
      JSON.stringify({
        success: true,
        data: data.map((d) => ({ ...d, jumlah: Number(d.jumlah) })),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        summary: { totalMasuk, totalKeluar, saldo },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const role = session.user.role as UserRole;
    if (role !== "RT_ADMIN" && role !== "SUPER_ADMIN") {
      throw new AuthError("Forbidden", 403);
    }
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const body = await req.json();
    const { jenis, kategori, keterangan, jumlah, tanggal, buktiUrl } = body;

    if (!jenis || !kategori || !keterangan || !jumlah) {
      return errorResponse("Jenis, kategori, keterangan, dan jumlah wajib diisi", 422);
    }

    if (!["MASUK", "KELUAR"].includes(jenis)) {
      return errorResponse("Jenis harus MASUK atau KELUAR", 422);
    }

    if (Number(jumlah) <= 0) {
      return errorResponse("Jumlah harus lebih dari 0", 422);
    }

    const transaction = await prisma.kasTransaction.create({
      data: {
        tenantId,
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        jenis,
        kategori,
        keterangan,
        jumlah,
        buktiUrl: buktiUrl || null,
        pencatat: session.user.name,
      },
    });

    return successResponse({ ...transaction, jumlah: Number(transaction.jumlah) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const body = await req.json();
    const { id, tanggal, jenis, kategori, keterangan, jumlah, buktiUrl } = body;

    if (!id) return errorResponse("ID transaksi harus diisi", 400);

    const existing = await prisma.kasTransaction.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return errorResponse("Transaksi tidak ditemukan", 404);

    const updateData: Record<string, unknown> = {};
    if (tanggal !== undefined) updateData.tanggal = new Date(tanggal);
    if (jenis !== undefined) {
      if (!["MASUK", "KELUAR"].includes(jenis)) {
        return errorResponse("Jenis harus MASUK atau KELUAR", 422);
      }
      updateData.jenis = jenis;
    }
    if (kategori !== undefined) updateData.kategori = kategori;
    if (keterangan !== undefined) updateData.keterangan = keterangan;
    if (jumlah !== undefined) {
      if (Number(jumlah) <= 0) {
        return errorResponse("Jumlah harus lebih dari 0", 422);
      }
      updateData.jumlah = jumlah;
    }
    if (buktiUrl !== undefined) updateData.buktiUrl = buktiUrl || null;

    const updated = await prisma.kasTransaction.update({
      where: { id },
      data: updateData,
    });

    return successResponse({ ...updated, jumlah: Number(updated.jumlah) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (!tenantId) return errorResponse("Tenant not found", 400);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return errorResponse("ID transaksi harus diisi", 400);

    const deleted = await prisma.kasTransaction.deleteMany({
      where: { id, tenantId },
    });

    if (deleted.count === 0) return errorResponse("Transaksi tidak ditemukan", 404);

    return successResponse({ message: "Transaksi berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}

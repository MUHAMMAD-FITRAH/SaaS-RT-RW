import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/db";
import { registerSchema } from "@/lib/validators/auth";
import { generateSlug } from "@/lib/utils";
import { successResponse, errorResponse, handleApiError } from "@/server/middleware/api-utils";
import { TRIAL_DAYS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join(", ");
      return errorResponse(errors, 422);
    }

    const { name, email, password, rtNumber, rwNumber, kelurahan, kecamatan, kota } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return errorResponse("Email sudah terdaftar", 409);
    }

    const tenantName = `RT ${rtNumber} RW ${rwNumber}${kelurahan ? ` ${kelurahan}` : ""}`;
    const slug = generateSlug(`rt${rtNumber}-rw${rwNumber}-${kelurahan || "tenant"}-${Date.now()}`);

    const hashedPassword = await hash(password, 12);
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        slug,
        rtNumber,
        rwNumber,
        kelurahan: kelurahan || null,
        kecamatan: kecamatan || null,
        kota: kota || null,
        subscription: {
          create: {
            tier: "TIER_A",
            status: "TRIALING",
            trialEndsAt: trialEnd,
          },
        },
        users: {
          create: {
            name,
            email,
            password: hashedPassword,
            role: "RT_ADMIN",
          },
        },
      },
      include: {
        users: { select: { id: true, email: true, name: true, role: true } },
        subscription: true,
      },
    });

    return successResponse({
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      user: tenant.users[0],
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

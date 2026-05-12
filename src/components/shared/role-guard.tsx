"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@prisma/client";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = session?.user?.role as UserRole | undefined;

  const hasAccess = role === "SUPER_ADMIN" || (role && allowedRoles.includes(role));

  useEffect(() => {
    if (status === "authenticated" && role && !hasAccess) {
      router.replace("/dashboard");
    }
  }, [status, role, hasAccess, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!role || !hasAccess) {
    return fallback ?? (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-lg font-semibold text-red-600">Akses Ditolak</p>
        <p className="text-sm text-muted-foreground mt-1">
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

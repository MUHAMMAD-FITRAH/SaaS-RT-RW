"use client";

import { useSession, signOut } from "next-auth/react";
import { Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import { getRoleLabel } from "@/lib/permissions";
import { UserRole } from "@prisma/client";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { data: session } = useSession();

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-md hover:bg-gray-100"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <h2 className="text-sm font-medium text-muted-foreground">
            {session?.user?.name
              ? `Selamat datang, ${session.user.name}`
              : "RT Online"}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {session?.user && (
          <>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {getRoleLabel(session.user.role as UserRole)}
              </p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
              {getInitials(session.user.name || "U")}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Sidebar }   from "@/components/layout/sidebar";
import { Topbar }    from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SOSFloatingButton } from "@/components/shared/sos-button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Memuat…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar — desktop: always visible | mobile: slide-over drawer */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        {/*
          pb-[calc(60px+env(safe-area-inset-bottom))] accounts for the fixed
          bottom nav on mobile so content isn't hidden behind it.
          On lg+ the bottom nav is hidden so we drop back to pb-6.
        */}
        <main className="flex-1 p-4 md:p-6 pb-[80px] lg:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav onMenuClick={() => setSidebarOpen(true)} />

      {/* SOS floating button — sits above bottom nav on mobile */}
      <SOSFloatingButton />
    </div>
  );
}

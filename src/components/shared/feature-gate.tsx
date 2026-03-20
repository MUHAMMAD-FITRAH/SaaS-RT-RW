"use client";

import { useCanAccess } from "@/hooks/use-feature";
import { Feature, getRequiredTier, getTierLabel } from "@/lib/features";
import { Lock } from "lucide-react";
import Link from "next/link";

interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const hasAccess = useCanAccess(feature);

  if (!hasAccess) {
    return fallback ?? <UpgradePrompt feature={feature} />;
  }

  return <>{children}</>;
}

function UpgradePrompt({ feature }: { feature: Feature }) {
  const requiredTier = getRequiredTier(feature);
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-muted rounded-lg">
      <Lock className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Fitur Premium</h3>
      <p className="text-muted-foreground mb-4">
        Fitur ini tersedia di paket{" "}
        <span className="font-semibold text-primary">
          {getTierLabel(requiredTier)}
        </span>{" "}
        ke atas.
      </p>
      <Link
        href="/pengaturan/langganan"
        className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Upgrade Sekarang
      </Link>
    </div>
  );
}

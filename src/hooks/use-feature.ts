"use client";

import { useSession } from "next-auth/react";
import { Feature, canAccess } from "@/lib/features";
import { SubscriptionTier } from "@prisma/client";

export function useCanAccess(feature: Feature): boolean {
  const { data: session } = useSession();
  if (!session?.user?.tier) return false;
  return canAccess(feature, session.user.tier as SubscriptionTier);
}

export function useTier(): SubscriptionTier {
  const { data: session } = useSession();
  return (session?.user?.tier as SubscriptionTier) ?? "TIER_A";
}

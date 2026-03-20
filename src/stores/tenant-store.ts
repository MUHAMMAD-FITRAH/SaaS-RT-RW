import { create } from "zustand";
import { SubscriptionTier } from "@prisma/client";

interface TenantState {
  tenantId: string | null;
  tenantName: string;
  tier: SubscriptionTier;
  setTenant: (tenantId: string, name: string, tier: SubscriptionTier) => void;
  reset: () => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenantId: null,
  tenantName: "",
  tier: "TIER_A" as SubscriptionTier,
  setTenant: (tenantId, tenantName, tier) =>
    set({ tenantId, tenantName, tier }),
  reset: () =>
    set({ tenantId: null, tenantName: "", tier: "TIER_A" as SubscriptionTier }),
}));

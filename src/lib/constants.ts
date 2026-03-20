export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "RT Online";

export const TIER_PRICES = {
  TIER_A: { monthly: 99000, label: "Basic" },
  TIER_B: { monthly: 199000, label: "Standard" },
  TIER_C: { monthly: 299000, label: "Premium" },
} as const;

export const TRIAL_DAYS = 14;

export const PAGINATION_DEFAULT = 10;
export const PAGINATION_OPTIONS = [10, 25, 50, 100];

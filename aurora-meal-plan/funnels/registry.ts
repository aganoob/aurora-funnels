/** Server-safe funnel metadata used by API routes. */
export const funnelRegistry = {
  "aurora-meal-plan": {
    productId: "aurora-meal-plan",
    checkoutOffers: ["annual"],
  },
} as const;

export const funnelProducts = {
  "aurora-meal-plan": funnelRegistry["aurora-meal-plan"].productId,
} as const;

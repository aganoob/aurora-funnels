import { defineProduct, type ProductDefinition } from "@aganoob/core";

export const auroraJourneyProduct = defineProduct({
  id: "aurora-journey",
  domains: ["aurora-journey.localhost"],
  brand: { name: "Aurora", accent: "#ff913d", background: "#ffffff" },
  offers: { annual: { stripePriceId: process.env.STRIPE_PRICE_AURORA_JOURNEY_ANNUAL ?? "price_placeholder_annual", label: "Annual plan", amount: 3499, currency: "gbp" } },
});

export const products: Record<string, ProductDefinition> = { "aurora-journey": auroraJourneyProduct };
export const productById = (id: string) => products[id];
// shipflow:add-product

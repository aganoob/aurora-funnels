import { defineProduct, type ProductDefinition } from "@aganoob/core";

export const auroraMealPlanProduct = defineProduct({
  id: "aurora-meal-plan",
  domains: ["aurora-meal-plan.localhost"],
  brand: { name: "aurora-meal-plan", accent: "#75e6c8", background: "#071622" },
  offers: { annual: { stripePriceId: process.env.STRIPE_PRICE_AURORA_MEAL_PLAN_ANNUAL ?? "price_placeholder_annual", label: "Annual plan", amount: 4900, currency: "usd" } },
});

export const products: Record<string, ProductDefinition> = { "aurora-meal-plan": auroraMealPlanProduct };
export const productById = (id: string) => products[id];
// shipflow:add-product

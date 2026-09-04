import { defineProduct, type ProductDefinition } from "@aganoob/core";

export const auroraMealPlanProduct = defineProduct({
  id: "aurora-meal-plan",
  domains: ["begin.aurorafirst.ai", "preview-begin.aurorafirst.ai"],
  brand: { name: "Aurora", accent: "#f47c38", background: "#ffffff" },
  offers: {
    annual: {
      label: "Annual membership",
      amount: 3499,
      currency: "gbp",
      payment: {
        provider: "stripe",
        catalogReference: process.env.STRIPE_PRICE_AURORA_MEAL_PLAN_ANNUAL ?? "price_placeholder_annual",
        presentation: "embedded",
        trialDays: 5,
      },
    },
  },
});

export const products: Record<string, ProductDefinition> = { "aurora-meal-plan": auroraMealPlanProduct };
export const productById = (id: string) => products[id];
// shipflow:add-product

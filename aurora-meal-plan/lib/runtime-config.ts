const productionRequiredKeys = [
  "META_CAPI_ACCESS_TOKEN",
  "NEXT_PUBLIC_APP_URL",
  "POSTHOG_PROJECT_API_KEY",
  "STRIPE_PRICE_AURORA_MEAL_PLAN_ANNUAL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

export function missingRuntimeConfiguration(environment: NodeJS.ProcessEnv = process.env) {
  if (environment.NODE_ENV !== "production") return [];

  return productionRequiredKeys.filter((key) => !environment[key]?.trim());
}

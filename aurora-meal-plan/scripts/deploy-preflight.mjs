import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const environmentPath = resolve(process.cwd(), process.argv[2] ?? ".shipflow/deploy/production.env");
const requiredKeys = [
  "PRODUCTION_IMAGE",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_META_DATASET_ID",
  "NEXT_PUBLIC_META_MODE",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "POSTHOG_PROJECT_API_KEY",
  "META_CAPI_ACCESS_TOKEN",
  "STRIPE_PRICE_AURORA_MEAL_PLAN_ANNUAL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "POSTGRES_DB",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "DATABASE_URL",
  "SHIPFLOW_DELIVERY_DRIVER",
  "SHIPFLOW_DELIVERY_ENCRYPTION_KEY",
];

function parseEnvironment(content) {
  return Object.fromEntries(content.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return [];
    const separator = trimmed.indexOf("=");
    if (separator === -1) return [];
    return [[trimmed.slice(0, separator), trimmed.slice(separator + 1).replace(/^['"]|['"]$/g, "")]];
  }));
}

let environment;
try {
  environment = parseEnvironment(readFileSync(environmentPath, "utf8"));
} catch (error) {
  console.error(`Unable to read deployment environment at ${environmentPath}.`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const issues = [];
for (const key of requiredKeys) {
  const value = environment[key];
  if (!value?.trim() || /replace_with|replace-with|placeholder|required/i.test(value)) issues.push(`${key} is missing or uses a placeholder.`);
}

if (environment.NPM_TOKEN) issues.push("NPM_TOKEN must be supplied only as a BuildKit secret.");
if (environment.PRODUCTION_IMAGE && !/@sha256:[a-f0-9]{64}$/i.test(environment.PRODUCTION_IMAGE)) issues.push("PRODUCTION_IMAGE must use an immutable sha256 digest.");
if (environment.NEXT_PUBLIC_APP_URL !== "https://aurora-meal.maratz.dev") issues.push("NEXT_PUBLIC_APP_URL must equal https://aurora-meal.maratz.dev.");
if (environment.NEXT_PUBLIC_META_MODE !== "live") issues.push("NEXT_PUBLIC_META_MODE must be live for production.");
if (environment.SHIPFLOW_DELIVERY_DRIVER !== "postgres") issues.push("SHIPFLOW_DELIVERY_DRIVER must be postgres.");
if (environment.DATABASE_URL && !environment.DATABASE_URL.includes("@production-postgres:5432/")) issues.push("DATABASE_URL must target the production-postgres service.");

if (issues.length) {
  console.error("Production deployment preflight failed:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Production deployment preflight passed for ${environmentPath}.`);

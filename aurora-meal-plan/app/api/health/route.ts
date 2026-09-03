import { NextResponse } from "next/server";
import { products } from "../../../lib/products";

const blank = (value: string | undefined) => !value?.trim();
const placeholder = (value: string | undefined) => !value || value.startsWith("price_placeholder_");
const localCheckoutMock = () => process.env.NODE_ENV !== "production" && process.env.MOCK_CHECKOUT === "true";

function missingFunnelConfiguration() {
  const missing = ["SHIPFLOW_PUBLIC_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"].filter((name) => blank(process.env[name]));
  for (const product of Object.values(products)) for (const [offerId, offer] of Object.entries(product.offers)) {
    if ("payment" in offer && placeholder(offer.payment.catalogReference)) missing.push(`catalog:${product.id}:${offerId}`);
  }
  return missing;
}

function missingDeliveryConfiguration() {
  return ["GOOGLE_CLOUD_PROJECT", "SHIPFLOW_GCP_REGION", "SHIPFLOW_FIRESTORE_DATABASE", "SHIPFLOW_CLOUD_TASKS_QUEUE", "SHIPFLOW_CLOUD_TASKS_SERVICE_ACCOUNT", "SHIPFLOW_DELIVERY_WORKER_URL", "SHIPFLOW_DELIVERY_ENCRYPTION_KEY", "META_CAPI_ACCESS_TOKEN", "POSTHOG_PROJECT_API_KEY"].filter((name) => blank(process.env[name]));
}

export const GET = () => {
  const role = process.env.SHIPFLOW_RUNTIME_ROLE ?? "funnel";
  const missing = role === "delivery" ? missingDeliveryConfiguration() : role === "funnel" && !localCheckoutMock() ? missingFunnelConfiguration() : role === "funnel" ? [] : ["SHIPFLOW_RUNTIME_ROLE"];
  if (missing.length) {
    console.error(JSON.stringify({ level: "error", code: "shipflow_runtime_configuration_error", role, missing }));
    return NextResponse.json({ ok: false, status: "configuration-error" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
};

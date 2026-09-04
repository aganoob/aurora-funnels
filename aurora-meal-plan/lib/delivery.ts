import { createDeliveryServiceClient } from "@aganoob/analytics-delivery/service";
import type { DeliveryServiceClient } from "@aganoob/analytics-delivery";

const kind = process.env.SHIPFLOW_ANALYTICS_DELIVERY_KIND ?? "browser-only";
const url = process.env.SHIPFLOW_ANALYTICS_DELIVERY_URL;
const auth = process.env.SHIPFLOW_ANALYTICS_DELIVERY_AUTH;
const hmacSecret = process.env.SHIPFLOW_ANALYTICS_DELIVERY_HMAC_SECRET;

let adapter: DeliveryServiceClient | undefined;
if (kind === "service" && url && auth === "hmac" && hmacSecret) adapter = createDeliveryServiceClient({ url, auth: { kind: "hmac", secret: hmacSecret } });
if (kind === "service" && url && auth === "google-oidc") adapter = createDeliveryServiceClient({ url, auth: { kind: "google-oidc" } });

export const deliveryAdapter = adapter;

export function deliveryConfigurationProblem() {
  if (kind === "browser-only") return undefined;
  if (kind !== "service") return "SHIPFLOW_ANALYTICS_DELIVERY_KIND must be browser-only or service";
  if (!url) return "Service analytics delivery requires SHIPFLOW_ANALYTICS_DELIVERY_URL";
  if (auth !== "hmac" && auth !== "google-oidc") return "Service analytics delivery requires SHIPFLOW_ANALYTICS_DELIVERY_AUTH=hmac or google-oidc";
  if (auth === "hmac" && !hmacSecret) return "HMAC analytics delivery requires SHIPFLOW_ANALYTICS_DELIVERY_HMAC_SECRET";
  return undefined;
}

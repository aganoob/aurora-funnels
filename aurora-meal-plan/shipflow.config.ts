import { defineMetaConfig } from "@aganoob/analytics-meta";

export const shipflowConfig = { sdkVersion: "2.3.1", preset: "next-docker-caddy", domains: ["begin.aurorafirst.ai", "preview-begin.aurorafirst.ai"] ,
  analytics: {
    meta: defineMetaConfig({
      datasetId: process.env.NEXT_PUBLIC_META_DATASET_ID,
      accessTokenEnv: "META_CAPI_ACCESS_TOKEN",
      testEventCodeEnv: "META_TEST_EVENT_CODE",
      consent: { default: "granted" },
      mode: process.env.NEXT_PUBLIC_META_MODE === "test" ? "test" : "live",
    }),
  },
  delivery: {
    kind: process.env.SHIPFLOW_ANALYTICS_DELIVERY_KIND ?? "browser-only",
    urlEnv: "SHIPFLOW_ANALYTICS_DELIVERY_URL",
    authEnv: "SHIPFLOW_ANALYTICS_DELIVERY_AUTH",
  },
} as const;

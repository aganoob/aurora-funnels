import { defineMetaConfig } from "@aganoob/analytics-meta";

export const shipflowConfig = { sdkVersion: "1.0.0", preset: "next-docker-nginx", domains: ["aurora-meal.maratz.dev"] ,
  analytics: {
    meta: defineMetaConfig({
      datasetId: process.env.NEXT_PUBLIC_META_DATASET_ID,
      accessTokenEnv: "META_CAPI_ACCESS_TOKEN",
      testEventCodeEnv: "META_TEST_EVENT_CODE",
      consent: { default: "granted" },
      mode: process.env.NEXT_PUBLIC_META_MODE === "test" ? "test" : "live",
    }),
  },
} as const;

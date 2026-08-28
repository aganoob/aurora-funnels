import { defineDeploymentConfig } from "@aganoob/deployment";
import { gcpAnalyticsDelivery, gcpCloudRun } from "@aganoob/deployment-gcp-cloud-run";

export default defineDeploymentConfig({
  environments: {
    production: {
      target: gcpCloudRun({
        projectId: "aurora-funnels",
        region: "europe-west2",
        service: "aurora-meal-production",
      }),
      domains: { primary: "aurora-meal.maratz.dev", aliases: [] },
      analyticsDelivery: gcpAnalyticsDelivery({ contextTtlDays: 7 }),
    },
  },
});

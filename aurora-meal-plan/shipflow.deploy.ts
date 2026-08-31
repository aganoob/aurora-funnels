import { defineDeploymentConfig } from "@aganoob/deployment";
import { gcpCloudRun } from "@aganoob/deployment-gcp-cloud-run";

export default defineDeploymentConfig({
  environments: {
    staging: {
      target: gcpCloudRun({
        projectId: "aurora-funnels",
        region: "europe-west2",
        service: "aurora-meal-staging",
      }),
      domains: { primary: "preview-start.aurorafirst.ai", aliases: [] },
      analyticsDelivery: { kind: "browser-only" },
    },
    production: {
      target: gcpCloudRun({
        projectId: "aurora-funnels",
        region: "europe-west2",
        service: "aurora-meal-production",
      }),
      domains: { primary: "start.aurorafirst.ai", aliases: [] },
      analyticsDelivery: { kind: "browser-only" },
    },
  },
});

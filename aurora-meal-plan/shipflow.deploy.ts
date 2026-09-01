import { defineDeploymentConfig } from "@aganoob/deployment";
import { gcpCloudRun } from "@aganoob/deployment-gcp-cloud-run";

export default defineDeploymentConfig({
  environments: {
    staging: {
      target: gcpCloudRun({
        projectId: "aurora-funnels",
        region: "europe-west1",
        service: "aurora-meal-staging",
      }),
      domains: { primary: "preview-begin.aurorafirst.ai", aliases: [] },
      analyticsDelivery: { kind: "browser-only" },
    },
    production: {
      target: gcpCloudRun({
        projectId: "aurora-funnels",
        region: "europe-west1",
        service: "aurora-meal-production",
      }),
      domains: { primary: "begin.aurorafirst.ai", aliases: [] },
      analyticsDelivery: { kind: "browser-only" },
    },
  },
});

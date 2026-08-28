import { defineDeploymentConfig } from "@aganoob/deployment";
import { gcpVm } from "@aganoob/deployment-gcp-vm";

export default defineDeploymentConfig({
  hosts: {
    production: gcpVm({
      projectId: "aurora-funnels",
      zone: "europe-west2-a",
      name: "aurora-meal-production",
      machineType: "auto",
    }),
  },
  environments: {
    production: {
      host: "production",
      domains: { primary: "aurora-meal.maratz.dev", aliases: [] },
      delivery: { mode: "postgres" },
    },
  },
});

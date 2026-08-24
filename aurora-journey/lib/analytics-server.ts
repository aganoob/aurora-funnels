import { createAnalytics, createPostHogServerAdapter } from "@aganoob/analytics";
import { createMetaServerAdapter } from "@aganoob/analytics-meta/server";
import { shipflowConfig } from "../shipflow.config";

export const serverAnalytics = createAnalytics({
  serverAdapters: [
    createPostHogServerAdapter(),
    createMetaServerAdapter(shipflowConfig.analytics.meta),
  ],
});

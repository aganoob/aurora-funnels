"use client";
import { createAnalytics, createFirstPartyBrowserAdapter, createPostHogBrowserAdapter } from "@aganoob/analytics";
import { createMetaBrowserAdapter } from "@aganoob/analytics-meta/browser";
import { shipflowConfig } from "../shipflow.config";

export const browserAnalytics = createAnalytics({
  browserAdapters: [createPostHogBrowserAdapter(), createFirstPartyBrowserAdapter(), createMetaBrowserAdapter(shipflowConfig.analytics.meta)],
});

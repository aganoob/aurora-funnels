"use client";
import { createAnalytics, createFirstPartyBrowserAdapter, createPostHogBrowserAdapter, type Analytics, type EventContext, type TrackedEvent } from "@aganoob/analytics";
import { createMetaBrowserAdapter } from "@aganoob/analytics-meta/browser";
import { shipflowConfig } from "../shipflow.config";
import { sdkEvent, type AppEvent } from "./analytics-events";

const analytics = createAnalytics({
  browserAdapters: [createPostHogBrowserAdapter(), createFirstPartyBrowserAdapter(), createMetaBrowserAdapter(shipflowConfig.analytics.meta)],
});

type AppAnalytics = Omit<Analytics, "track"> & {
  track: (event: AppEvent, context: EventContext, properties?: Record<string, unknown>) => Promise<TrackedEvent>;
};

export const browserAnalytics: AppAnalytics = {
  ...analytics,
  track: (event, context, properties) => analytics.track(sdkEvent(event), context, properties),
};

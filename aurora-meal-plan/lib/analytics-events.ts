import { canonicalEvents, type CanonicalEvent } from "@aganoob/analytics";

export type AppEvent = Exclude<CanonicalEvent, "checkout_completed"> | "purchase_completed";

export const appEvents: readonly AppEvent[] = [
  ...canonicalEvents.filter((event) => event !== "checkout_completed"),
  "purchase_completed",
];

const appEventNames: ReadonlySet<string> = new Set(appEvents);

export function isAppEvent(event: string): event is AppEvent {
  return appEventNames.has(event);
}

// The shared SDK does not include purchase_completed yet. Its runtime accepts
// event names as strings, so keep the compatibility cast at this boundary.
export function sdkEvent(event: AppEvent): CanonicalEvent {
  return event as CanonicalEvent;
}

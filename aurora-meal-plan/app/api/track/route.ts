import { NextResponse } from "next/server";
import { canonicalEvents, capturePostHogServer, forwardMetaConversion, type TrackedEvent } from "@aganoob/analytics";
export async function POST(request: Request) { const event = await request.json() as TrackedEvent; if (!canonicalEvents.includes(event.event)) return NextResponse.json({ error: "Invalid event" }, { status: 400 }); const [posthog, meta] = await Promise.all([capturePostHogServer(event), forwardMetaConversion(event)]); return NextResponse.json({ accepted: true, providers: { posthog, meta } }, { status: 202 }); }

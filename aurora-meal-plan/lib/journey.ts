const stagingJourneyOrigin = "https://ai-journey-alpha.web.app";

export function journeyWelcomeUrl(sessionId: string) {
  const url = new URL("/welcome", process.env.NEXT_PUBLIC_JOURNEY_BASE_URL || stagingJourneyOrigin);
  url.searchParams.set("funnel_session_id", sessionId);
  url.searchParams.set("platform", "custom_funnel");
  return url.toString();
}

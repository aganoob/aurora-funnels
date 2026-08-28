export async function startDeliveryWorker() {
  if (process.env.SHIPFLOW_DELIVERY_WORKER !== "true" || !process.env.DATABASE_URL || !process.env.SHIPFLOW_DELIVERY_ENCRYPTION_KEY) return;

  const worker = globalThis as typeof globalThis & { shipflowDeliveryWorkerStarted?: boolean };
  if (worker.shipflowDeliveryWorkerStarted) return;
  worker.shipflowDeliveryWorkerStarted = true;

  const [{ runPostgresWorker }, { getDelivery }, { serverAnalytics }] = await Promise.all([
    import("@aganoob/analytics-delivery/postgres"),
    import("./lib/delivery"),
    import("./lib/analytics-server"),
  ]);
  const controller = new AbortController();
  void runPostgresWorker(getDelivery(), async (envelope) => {
    const providers = await serverAnalytics.deliver(envelope.event);
    const failure = providers.find((provider) => provider.status === "rejected" || provider.status === "retryable");
    return failure && "message" in failure ? { accepted: false, retryable: failure.status === "retryable", message: failure.message } : { accepted: true };
  }, controller.signal);
}

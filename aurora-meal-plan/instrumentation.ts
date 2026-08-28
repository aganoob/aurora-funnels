export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDeliveryWorker } = await import("./instrumentation-server");
    await startDeliveryWorker();
  }
}

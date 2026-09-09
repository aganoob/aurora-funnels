import { notFound } from "next/navigation";
import { FunnelApp, type PaymentResultRoute } from "../../../../components/funnel-app";

const resultRoutes = new Set<PaymentResultRoute>(["payment-success", "payment-failed"]);

export default async function PaymentResultPage({ params }: { params: Promise<{ funnelId: string; paymentResult: string }> }) {
  const { funnelId, paymentResult } = await params;
  if (!resultRoutes.has(paymentResult as PaymentResultRoute)) notFound();
  return <FunnelApp funnelId={funnelId} paymentResult={paymentResult as PaymentResultRoute} />;
}

import { FunnelApp } from "../../../components/funnel-app";
export default async function FunnelPage({ params }: { params: Promise<{ funnelId: string }> }) { return <FunnelApp funnelId={(await params).funnelId} />; }

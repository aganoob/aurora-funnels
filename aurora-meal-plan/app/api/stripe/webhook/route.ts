import { NextResponse } from "next/server";
export async function POST() { const secret = process.env.STRIPE_WEBHOOK_SECRET; const key = process.env.STRIPE_SECRET_KEY; if (!secret?.trim() || !key?.trim()) return NextResponse.json({ received: true, mocked: true }, { status: 202 }); return NextResponse.json({ received: true }); }

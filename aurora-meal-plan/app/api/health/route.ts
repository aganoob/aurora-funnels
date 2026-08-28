import { NextResponse } from "next/server";
import { missingRuntimeConfiguration } from "../../../lib/runtime-config";

export const GET = () => {
  const missing = missingRuntimeConfiguration();
  if (missing.length) return NextResponse.json({ ok: false, status: "configuration-error" }, { status: 503 });

  return NextResponse.json({ ok: true });
};

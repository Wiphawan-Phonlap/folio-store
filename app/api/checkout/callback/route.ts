import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order_id");
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!orderId || !sessionId?.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid payment callback" }, { status: 400 });
  }

  const callbackUrl = new URL("folio://payment-result");
  callbackUrl.searchParams.set("order_id", orderId);
  callbackUrl.searchParams.set("session_id", sessionId);
  return NextResponse.redirect(callbackUrl);
}

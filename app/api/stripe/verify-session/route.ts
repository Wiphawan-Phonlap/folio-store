import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  console.log("[stripe-verify-session] Received fallback verification request");

  try {
    const body = await req.json();
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";

    if (!sessionId || !sessionId.startsWith("cs_")) {
      console.error("[stripe-verify-session] Invalid session ID");
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[stripe-verify-session] User is not authenticated", authError);
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const orderIdValue =
      session.metadata?.order_id || session.client_reference_id;
    const orderId = Number(orderIdValue);

    console.log("[stripe-verify-session] Retrieved Checkout Session", {
      sessionId,
      paymentStatus: session.payment_status,
      orderId: orderIdValue,
      sessionUserId: session.metadata?.user_id,
    });

    if (!Number.isInteger(orderId) || orderId <= 0) {
      console.error("[stripe-verify-session] Session has no valid order ID");
      return NextResponse.json({ error: "Session has no valid order" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("[stripe-verify-session] Failed to find order", orderError);
      return NextResponse.json({ error: "Order lookup failed" }, { status: 500 });
    }

    if (!order || order.user_id !== user.id || session.metadata?.user_id !== user.id) {
      console.error("[stripe-verify-session] Session/order ownership mismatch", {
        orderId,
        orderUserId: order?.user_id,
        sessionUserId: session.metadata?.user_id,
        authenticatedUserId: user.id,
      });
      return NextResponse.json({ error: "Order access denied" }, { status: 403 });
    }

    if (session.payment_status !== "paid") {
      console.log("[stripe-verify-session] Payment is not complete", {
        sessionId,
        paymentStatus: session.payment_status,
      });
      return NextResponse.json({ status: order.status, updated: false });
    }

    if (order.status === "pending") {
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "paid" })
        .eq("id", order.id)
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (updateError) {
        console.error("[stripe-verify-session] Failed to update order", updateError);
        return NextResponse.json({ error: "Order update failed" }, { status: 500 });
      }

      console.log("[stripe-verify-session] Fallback updated order to paid", {
        orderId: order.id,
      });
      return NextResponse.json({ status: "paid", updated: true });
    }

    console.log("[stripe-verify-session] Order already finalized", {
      orderId: order.id,
      status: order.status,
    });
    return NextResponse.json({ status: order.status, updated: false });
  } catch (error: unknown) {
    console.error("[stripe-verify-session] Unexpected error", error);
    const message = error instanceof Error ? error.message : "Session verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

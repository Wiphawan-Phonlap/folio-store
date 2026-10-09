import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import Stripe from "stripe";

export async function handleStripeWebhook(req: NextRequest) {
  console.log("[stripe-webhook] Received request", {
    method: req.method,
    path: req.nextUrl.pathname,
  });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET environment variable");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("[stripe-webhook] Missing stripe-signature header");
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  // 1. ต้องอ่าน raw body (req.text()) ไม่ใช่ json
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err: unknown) {
    console.error("[stripe-webhook] Error reading raw body:", err);
    return new NextResponse("Error reading request body", { status: 400 });
  }

  console.log("[stripe-webhook] Raw body received", {
    length: rawBody.length,
  });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  console.log("[stripe-webhook] Signature verified", {
    eventId: event.id,
    eventType: event.type,
  });

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderIdStr =
      session.metadata?.order_id ||
      session.metadata?.orderId ||
      session.client_reference_id;

    console.log("[stripe-webhook] Checkout session received", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      orderId: orderIdStr,
      userId: session.metadata?.user_id,
    });

    if (session.payment_status !== "paid") {
      console.log("[stripe-webhook] Payment is not paid yet; leaving order pending", {
        sessionId: session.id,
        paymentStatus: session.payment_status,
      });
      return NextResponse.json({ received: true });
    }

    if (!orderIdStr) {
      console.error(
        "[stripe-webhook] Missing order ID in session metadata or client_reference_id:",
        session.id
      );
      return new NextResponse("Missing order ID in session", { status: 400 });
    }

    const orderId = Number(orderIdStr);
    if (isNaN(orderId)) {
      console.error("[stripe-webhook] Invalid order ID format:", orderIdStr);
      return new NextResponse("Invalid order ID format", { status: 400 });
    }

    try {
      console.log("[stripe-webhook] Creating Supabase admin client", {
        orderId,
      });
      const supabaseAdmin = createAdminClient();
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("id, user_id, status")
        .eq("id", orderId)
        .maybeSingle();

      if (orderError) {
        console.error("[stripe-webhook] Failed to find order:", orderError);
        return new NextResponse(`Database lookup failed: ${orderError.message}`, {
          status: 500,
        });
      }

      if (!order) {
        console.error("[stripe-webhook] Order not found:", orderId);
        return new NextResponse("Order not found", { status: 404 });
      }

      if (
        session.metadata?.user_id &&
        session.metadata.user_id !== order.user_id
      ) {
        console.error("[stripe-webhook] Session user does not own order", {
          orderId,
          sessionUserId: session.metadata.user_id,
          orderUserId: order.user_id,
        });
        return new NextResponse("Order ownership mismatch", { status: 400 });
      }

      if (order.status === "paid") {
        console.log("[stripe-webhook] Order is already paid", { orderId });
        return NextResponse.json({ received: true });
      }

      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "paid" })
        .eq("id", orderId)
        .eq("status", "pending");

      if (updateError) {
        console.error(
          `[stripe-webhook] Failed to update order #${orderId} status to 'paid':`,
          updateError
        );
        return new NextResponse(
          `Database update failed: ${updateError.message}`,
          { status: 500 }
        );
      }

      console.log(`[stripe-webhook] Successfully updated order #${orderId} to 'paid'`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Database error";
      console.error("[stripe-webhook] Error during order update:", err);
      return new NextResponse(`Internal error: ${message}`, {
        status: 500,
      });
    }
  } else if (
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "checkout.session.expired"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderIdStr = session.metadata?.order_id || session.metadata?.orderId || session.client_reference_id;
    const orderId = Number(orderIdStr);
    if (!Number.isInteger(orderId)) return new NextResponse("Invalid order ID format", { status: 400 });
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", orderId).eq("status", "pending");
    if (error) return new NextResponse(`Database update failed: ${error.message}`, { status: 500 });
  } else {
    console.log("[stripe-webhook] Ignoring unsupported event type", event.type);
  }

  console.log("[stripe-webhook] Request completed successfully", {
    eventId: event.id,
  });
  return NextResponse.json({ received: true });
}

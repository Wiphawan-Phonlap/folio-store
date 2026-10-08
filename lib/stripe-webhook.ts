import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import Stripe from "stripe";

export async function handleStripeWebhook(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET environment variable");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  // 1. ต้องอ่าน raw body (req.text()) ไม่ใช่ json
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err: unknown) {
    console.error("Error reading raw body:", err);
    return new NextResponse("Error reading request body", { status: 400 });
  }

  // 2. ต้องตรวจ signature ด้วย STRIPE_WEBHOOK_SECRET
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature verification failed:", message);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  // 3. รับ event checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderIdStr =
      session.metadata?.order_id ||
      session.metadata?.orderId ||
      session.client_reference_id;

    if (!orderIdStr) {
      console.error(
        "Missing order ID in session metadata or client_reference_id:",
        session.id
      );
      return new NextResponse("Missing order ID in session", { status: 400 });
    }

    const orderId = Number(orderIdStr);
    if (isNaN(orderId)) {
      console.error("Invalid order ID format:", orderIdStr);
      return new NextResponse("Invalid order ID format", { status: 400 });
    }

    try {
      // 4. ใช้ SUPABASE_SERVICE_ROLE_KEY อัปเดต orders.status เป็น 'paid'
      const supabaseAdmin = createAdminClient();
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "paid" })
        .eq("id", orderId);

      if (updateError) {
        console.error(
          `Failed to update order #${orderId} status to 'paid':`,
          updateError
        );
        return new NextResponse(
          `Database update failed: ${updateError.message}`,
          { status: 500 }
        );
      }

      console.log(`Successfully updated order #${orderId} to 'paid'`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Database error";
      console.error("Error during order update in webhook:", err);
      return new NextResponse(`Internal error: ${message}`, {
        status: 500,
      });
    }
  }

  return NextResponse.json({ received: true });
}

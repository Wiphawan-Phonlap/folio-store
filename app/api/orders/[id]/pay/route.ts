import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" }, { status: 401 });

  const orderId = Number((await props.params).id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, status, stripe_session_id")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (orderError) {
    console.error("[orders/pay] อ่านคำสั่งซื้อไม่สำเร็จ", {
      orderId,
      code: orderError.code,
      message: orderError.message,
    });
    return NextResponse.json({ error: "ไม่สามารถอ่านคำสั่งซื้อได้" }, { status: 500 });
  }
  if (!order) return NextResponse.json({ error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  if (order.status !== "pending") return NextResponse.json({ error: "คำสั่งซื้อนี้ไม่อยู่ในสถานะรอชำระเงิน" }, { status: 400 });

  const admin = createAdminClient();
  const stripe = getStripe();
  if (order.stripe_session_id) {
    const oldSession = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    if (oldSession.status === "open" && oldSession.url) {
      return NextResponse.json({ url: oldSession.url });
    }
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id")
    .eq("order_id", orderId);
  if (itemsError) {
    console.error("[orders/pay] อ่านรายการหนังสือไม่สำเร็จ", {
      orderId,
      code: itemsError.code,
      message: itemsError.message,
    });
    return NextResponse.json({ error: "ไม่สามารถอ่านรายการหนังสือได้" }, { status: 500 });
  }

  const { data: paidItems, error: paidItemsError } = await admin
    .from("order_items")
    .select("product_id, orders!inner(user_id, status)")
    .eq("orders.user_id", user.id)
    .eq("orders.status", "paid");
  if (paidItemsError) return NextResponse.json({ error: "ไม่สามารถตรวจสอบหนังสือที่มีอยู่แล้วได้" }, { status: 500 });

  const ownedIds = new Set((paidItems || []).map((item) => item.product_id));
  const remainingIds = (items || []).map((item) => item.product_id).filter((id) => !ownedIds.has(id));
  if (!remainingIds.length) {
    await admin.from("orders").update({ status: "failed" }).eq("id", orderId).eq("status", "pending");
    return NextResponse.json({ error: "คุณมีหนังสือเล่มนี้แล้ว", cancelled: true }, { status: 400 });
  }

  const { data: products, error: productsError } = await admin
    .from("products")
    .select("id, title, price")
    .in("id", remainingIds);
  if (productsError || !products || products.length !== new Set(remainingIds).size) {
    return NextResponse.json({ error: "ไม่สามารถคำนวณราคาหนังสือได้" }, { status: 500 });
  }

  const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    line_items: products.map((product) => ({
      price_data: {
        currency: "thb",
        product_data: { name: product.title },
        unit_amount: Math.round(Number(product.price) * 100),
      },
      quantity: 1,
    })),
    mode: "payment",
    success_url: `${origin}/checkout/success?order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/orders`,
    client_reference_id: String(orderId),
    customer_email: user.email,
    metadata: { order_id: String(orderId), orderId: String(orderId), user_id: user.id },
  });
  if (!session.url) return NextResponse.json({ error: "ไม่สามารถสร้างหน้าชำระเงินได้" }, { status: 502 });

  const { error: updateError } = await admin
    .from("orders")
    .update({ stripe_session_id: session.id })
    .eq("id", orderId)
    .eq("user_id", user.id)
    .eq("status", "pending");
  if (updateError) return NextResponse.json({ error: "ไม่สามารถบันทึกการชำระเงินได้" }, { status: 500 });
  return NextResponse.json({ url: session.url });
}

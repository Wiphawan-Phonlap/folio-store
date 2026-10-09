import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { getPaymentSuccessUrl } from "@/lib/payment-return-url";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawOrderId = body.orderId ?? body.order_id;
    const native = body.native === true;

    if (!rawOrderId) {
      return NextResponse.json(
        { error: "กรุณาระบุหมายเลขคำสั่งซื้อ (orderId)" },
        { status: 400 }
      );
    }

    const orderId = Number(rawOrderId);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // 1. ตรวจว่าผู้ใช้ล็อกอินด้วย @supabase/ssr ฝั่งเซิร์ฟเวอร์
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" },
        { status: 401 }
      );
    }

    // 2. ตรวจสอบว่าออเดอร์มีอยู่จริง และผู้ใช้เป็นเจ้าของออเดอร์นั้น
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, status, total")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "ไม่พบคำสั่งซื้อ" },
        { status: 404 }
      );
    }

    if (order.user_id !== user.id) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้" },
        { status: 403 }
      );
    }

    if (order.status === "paid") {
      return NextResponse.json(
        { error: "คำสั่งซื้อนี้ชำระเงินเรียบร้อยแล้ว" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: paidItems, error: paidItemsError } = await admin
      .from("order_items")
      .select("product_id, orders!inner(user_id, status)")
      .eq("orders.user_id", user.id)
      .eq("orders.status", "paid");
    if (paidItemsError) return NextResponse.json({ error: "ไม่สามารถตรวจสอบหนังสือที่ซื้อแล้วได้" }, { status: 500 });
    const ownedIds = new Set((paidItems || []).map((item) => item.product_id));

    const { data: orderItems, error: itemsError } = await admin
      .from("order_items")
      .select("id, product_id, qty")
      .eq("order_id", orderId);

    if (itemsError || !orderItems || orderItems.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบรายการสินค้าในคำสั่งซื้อ" },
        { status: 400 }
      );
    }
    const remainingItems = orderItems.filter((item) => !ownedIds.has(item.product_id));
    if (remainingItems.length === 0) {
      await admin.from("orders").update({ status: "failed" }).eq("id", orderId).eq("status", "pending");
      return NextResponse.json({ error: "คุณมีหนังสือเล่มนี้แล้ว" }, { status: 400 });
    }
    if (remainingItems.length !== orderItems.length) {
      await admin.from("order_items").delete().eq("order_id", orderId).in("product_id", [...ownedIds]);
    }

    // 3. คิดราคาจากตาราง products ฝั่งเซิร์ฟเวอร์ ห้ามเชื่อราคาที่ client ส่งมา
    const productIds = remainingItems.map((item) => item.product_id);
    const { data: products, error: productsError } = await admin
      .from("products")
      .select("id, title, price, is_published")
      .in("id", productIds);

    if (productsError || !products || products.length === 0) {
      return NextResponse.json(
        { error: "ไม่สามารถดึงข้อมูลสินค้าเพื่อคำนวณราคาได้" },
        { status: 500 }
      );
    }

    const unavailableIds = products.filter((p) => p.is_published === false).map((p) => p.id);
    if (unavailableIds.length) {
      await admin.from("order_items").delete().eq("order_id", orderId).in("product_id", unavailableIds);
    }
    const productMap = new Map(products.filter((p) => p.is_published !== false).map((p) => [p.id, p]));
    if (productMap.size === 0) {
      await admin.from("orders").update({ status: "failed" }).eq("id", orderId).eq("status", "pending");
      return NextResponse.json({ error: "หนังสือในคำสั่งซื้อถูกซ่อนแล้ว กรุณากลับไปเลือกหนังสือใหม่" }, { status: 400 });
    }

    for (const item of remainingItems) {
      if (!productMap.has(item.product_id)) {
        return NextResponse.json(
          { error: `ไม่พบสินค้า ID: ${item.product_id} ในระบบ` },
          { status: 400 }
        );
      }
    }

    const line_items = remainingItems.map((item) => {
      const product = productMap.get(item.product_id)!;
      const unitPrice = Number(product.price);
      return {
        price_data: {
          currency: "thb",
          product_data: {
            name: product.title,
          },
          unit_amount: Math.round(unitPrice * 100), // แปลงเป็นสตางค์ (THB 2 decimals)
        },
        quantity: item.qty,
      };
    });

    // 4. สร้าง Stripe Checkout Session
    const origin =
      req.nextUrl?.origin ||
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: getPaymentSuccessUrl(origin, order.id, native),
      cancel_url: `${origin}/cart`,
      client_reference_id: String(order.id),
      customer_email: user.email,
      metadata: {
        order_id: String(order.id),
        orderId: String(order.id),
        user_id: user.id,
      },
    });

    const { error: sessionUpdateError } = await admin
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id)
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (sessionUpdateError) {
      console.error("Failed to save Stripe session ID:", {
        message: sessionUpdateError.message,
        code: sessionUpdateError.code,
        details: sessionUpdateError.details,
      });
      return NextResponse.json(
        { error: "บันทึกข้อมูลการชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน";
    console.error("Error creating Stripe checkout session:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

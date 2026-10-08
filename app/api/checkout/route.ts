import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawOrderId = body.orderId ?? body.order_id;

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

    // ดึงรายการ order_items ของคำสั่งซื้อนี้
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("id, product_id, qty")
      .eq("order_id", orderId);

    if (itemsError || !orderItems || orderItems.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบรายการสินค้าในคำสั่งซื้อ" },
        { status: 400 }
      );
    }

    // 3. คิดราคาจากตาราง products ฝั่งเซิร์ฟเวอร์ ห้ามเชื่อราคาที่ client ส่งมา
    const productIds = orderItems.map((item) => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, title, price")
      .in("id", productIds);

    if (productsError || !products || products.length === 0) {
      return NextResponse.json(
        { error: "ไม่สามารถดึงข้อมูลสินค้าเพื่อคำนวณราคาได้" },
        { status: 500 }
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of orderItems) {
      if (!productMap.has(item.product_id)) {
        return NextResponse.json(
          { error: `ไม่พบสินค้า ID: ${item.product_id} ในระบบ` },
          { status: 400 }
        );
      }
    }

    const line_items = orderItems.map((item) => {
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
      success_url: `${origin}/library?success=true&order_id=${order.id}`,
      cancel_url: `${origin}/cart`,
      client_reference_id: String(order.id),
      customer_email: user.email,
      metadata: {
        order_id: String(order.id),
        orderId: String(order.id),
        user_id: user.id,
      },
    });

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

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";

type CheckoutItem = { productId: number; quantity: number };
type ProductRow = { id: number; title: string; price: number; is_published: boolean | null };
type ServerItem = { product_id: number; title: string; price: number; qty: number };
type PaidItem = { product_id: number };

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const items: CheckoutItem[] = Array.isArray(body.items)
      ? body.items
        .map((item: { productId?: unknown; quantity?: unknown }): CheckoutItem => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
        }))
        .filter((item: CheckoutItem) => Number.isInteger(item.productId) && item.productId > 0 && Number.isInteger(item.quantity) && item.quantity > 0)
      : [];
    if (!items.length) return NextResponse.json({ error: "กรุณาเลือกหนังสืออย่างน้อย 1 เล่ม" }, { status: 400 });

    const admin = createAdminClient();
    const ids = [...new Set(items.map((item: CheckoutItem) => item.productId))];
    const { data: products, error: productsError } = await admin
      .from("products")
      .select("id, title, price, is_published")
      .in("id", ids);
    if (productsError) return NextResponse.json({ error: "ไม่สามารถตรวจสอบหนังสือได้" }, { status: 500 });

    const productRows = (products ?? []) as ProductRow[];
    const productMap = new Map(productRows.filter((product: ProductRow) => product.is_published !== false).map((product: ProductRow) => [product.id, product]));
    if (productMap.size !== ids.length) {
      return NextResponse.json({ error: "มีหนังสือที่ไม่พร้อมจำหน่าย กรุณาตรวจสอบรายการอีกครั้ง" }, { status: 400 });
    }

    const { data: paidItems, error: ownedError } = await admin
      .from("order_items")
      .select("product_id, orders!inner(user_id, status)")
      .eq("orders.user_id", user.id)
      .eq("orders.status", "paid")
      .in("product_id", ids);
    if (ownedError) return NextResponse.json({ error: "ไม่สามารถตรวจสอบหนังสือที่มีอยู่แล้วได้" }, { status: 500 });
    const paidRows = (paidItems ?? []) as PaidItem[];
    const ownedIds = new Set(paidRows.map((item: PaidItem) => item.product_id));
    if (ownedIds.size) return NextResponse.json({ error: "คุณมีหนังสือบางเล่มในรายการนี้อยู่แล้ว" }, { status: 400 });

    const serverItems: ServerItem[] = items.map((item: CheckoutItem) => {
      const product = productMap.get(item.productId)!;
      return {
        product_id: product.id,
        title: product.title,
        price: Number(product.price),
        qty: item.quantity,
      };
    });
    const total = serverItems.reduce((sum: number, item: { price: number; qty: number }) => sum + item.price * item.qty, 0);
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({ user_id: user.id, total, status: "pending" })
      .select("id")
      .single();
    if (orderError || !order) return NextResponse.json({ error: "สร้างคำสั่งซื้อไม่สำเร็จ" }, { status: 500 });

    const { error: itemsError } = await admin.from("order_items").insert(
      serverItems.map((item: ServerItem) => ({ ...item, order_id: order.id }))
    );
    if (itemsError) return NextResponse.json({ error: "บันทึกรายการหนังสือไม่สำเร็จ" }, { status: 500 });

    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const session = await getStripe().checkout.sessions.create({
      line_items: serverItems.map((item: ServerItem) => ({
        price_data: {
          currency: "thb",
          product_data: { name: item.title },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.qty,
      })),
      mode: "payment",
      success_url: `${origin}/checkout/success?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      client_reference_id: String(order.id),
      customer_email: user.email,
      metadata: { order_id: String(order.id), orderId: String(order.id), user_id: user.id },
    });

    const { error: sessionError } = await admin
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id)
      .eq("status", "pending");
    if (sessionError) return NextResponse.json({ error: "บันทึกข้อมูลการชำระเงินไม่สำเร็จ" }, { status: 500 });

    return NextResponse.json({ url: session.url, orderId: order.id });
  } catch (error: unknown) {
    console.error("Direct checkout failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "สร้างรายการชำระเงินไม่สำเร็จ" }, { status: 500 });
  }
}

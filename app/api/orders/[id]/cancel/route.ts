import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" }, { status: 401 });
  const orderId = Number((await props.params).id);
  if (!Number.isInteger(orderId) || orderId <= 0) return NextResponse.json({ error: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" }, { status: 400 });

  const admin = createAdminClient();
  const { data: order, error } = await admin.from("orders").select("id, user_id, status, stripe_session_id").eq("id", orderId).maybeSingle();
  if (error) return NextResponse.json({ error: "ไม่สามารถอ่านคำสั่งซื้อได้" }, { status: 500 });
  if (!order) return NextResponse.json({ error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  if (order.user_id !== user.id) return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้" }, { status: 403 });
  if (order.status !== "pending") return NextResponse.json({ error: "ยกเลิกได้เฉพาะคำสั่งซื้อที่รอชำระเงิน" }, { status: 400 });

  if (order.stripe_session_id) {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    if (session.status === "open") await stripe.checkout.sessions.expire(order.stripe_session_id);
  }
  const { error: updateError } = await admin.from("orders").update({ status: "failed" }).eq("id", orderId).eq("user_id", user.id).eq("status", "pending");
  if (updateError) return NextResponse.json({ error: "ไม่สามารถยกเลิกคำสั่งซื้อได้" }, { status: 500 });
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format");
  const productId = Number(req.nextUrl.searchParams.get("productId"));

  if ((format !== "pdf" && format !== "epub") || !Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: "พารามิเตอร์การดาวน์โหลดไม่ถูกต้อง" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const admin = createAdminClient();
  const { data: orders, error: ordersError } = await admin
    .from("orders")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "paid");
  if (ordersError) return NextResponse.json({ error: "ตรวจสอบสิทธิ์การดาวน์โหลดไม่สำเร็จ" }, { status: 500 });

  const orderIds = (orders ?? []).map((order) => order.id);
  if (orderIds.length === 0) return NextResponse.json({ error: "ไม่มีสิทธิ์ดาวน์โหลดหนังสือเล่มนี้" }, { status: 403 });

  const { data: item, error: itemError } = await admin
    .from("order_items")
    .select("product_id")
    .eq("product_id", productId)
    .in("order_id", orderIds)
    .maybeSingle();
  if (itemError) return NextResponse.json({ error: "ตรวจสอบรายการสั่งซื้อไม่สำเร็จ" }, { status: 500 });
  if (!item) return NextResponse.json({ error: "ไม่มีสิทธิ์ดาวน์โหลดหนังสือเล่มนี้" }, { status: 403 });

  const { data: product, error: productError } = await admin
    .from("products")
    .select("pdf_path, epub_path")
    .eq("id", productId)
    .single();
  if (productError || !product) return NextResponse.json({ error: "ไม่พบหนังสือ" }, { status: 404 });

  const path = format === "pdf" ? product.pdf_path : product.epub_path;
  if (!path) return NextResponse.json({ error: `หนังสือเล่มนี้ยังไม่มีไฟล์ ${format.toUpperCase()}` }, { status: 404 });

  const { data, error } = await admin.storage.from("books").createSignedUrl(path, 60, { download: true });
  if (error || !data) return NextResponse.json({ error: "สร้างลิงก์ดาวน์โหลดไม่สำเร็จ" }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}

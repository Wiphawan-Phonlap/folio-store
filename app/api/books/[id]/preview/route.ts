import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(_: Request, props: { params: Promise<{ id: string }> }) {
  const id = Number((await props.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "รหัสหนังสือไม่ถูกต้อง" }, { status: 400 });
  const admin = createAdminClient();
  const { data: product, error } = await admin.from("products").select("preview_path").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "โหลดตัวอย่างไม่สำเร็จ" }, { status: 500 });
  if (!product?.preview_path) return NextResponse.json({ error: "ยังไม่มีตัวอย่าง" }, { status: 404 });
  const { data, error: signedError } = await admin.storage.from("books").createSignedUrl(product.preview_path, 300);
  if (signedError || !data) return NextResponse.json({ error: "สร้างลิงก์ตัวอย่างไม่สำเร็จ" }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}

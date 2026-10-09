import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;

  const { id: rawId } = await props.params;
  const id = Number(rawId);
  if (isNaN(id)) {
    return NextResponse.json({ error: "รหัสหนังสือไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const supabaseAdmin = createAdminClient();

    // ตรวจสอบว่ามีสินค้านี้อยู่จริง
    const { data: product, error: prodError } = await supabaseAdmin
      .from("products")
      .select("id, title")
      .eq("id", id)
      .single();

    if (prodError || !product) {
      return NextResponse.json({ error: "ไม่พบหนังสือในระบบ" }, { status: 404 });
    }

    // สร้าง signed upload URL สำหรับอัปโหลดไฟล์เข้า bucket books โดยตรง
    const filePath = `${id}.pdf`;
    const { data, error } = await supabaseAdmin.storage
      .from("books")
      .createSignedUploadUrl(filePath, { upsert: true });

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "ไม่สามารถสร้าง signed upload URL ได้" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      filePath,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase-admin";

export async function PUT(
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
    const body = await req.json().catch(() => ({}));
    const {
      title,
      author,
      price,
      subtitle,
      description,
      category_id,
      is_featured,
      is_published,
    } = body;

    // ตรวจสอบความถูกต้องของข้อมูลฝั่งเซิร์ฟเวอร์
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "กรุณาระบุชื่อหนังสือ (title)" },
        { status: 400 }
      );
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return NextResponse.json(
        { error: "ราคาต้องเป็นตัวเลขและไม่ติดลบ (price >= 0)" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("products")
      .update({
        title: title.trim(),
        author: author?.trim() || "",
        price: numPrice,
        subtitle: subtitle?.trim() || null,
        description: description?.trim() || null,
        category_id: category_id ? Number(category_id) : null,
        is_featured: !!is_featured,
        ...(typeof is_published === "boolean" ? { is_published } : {}),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("cover_path, pdf_path, epub_path, preview_path")
      .eq("id", id)
      .maybeSingle();
    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }
    if (!product) {
      return NextResponse.json({ error: "ไม่พบหนังสือ" }, { status: 404 });
    }

    // หนังสือที่อยู่ในประวัติคำสั่งซื้อห้ามลบ เพื่อไม่ให้ประวัติและการดาวน์โหลดเสียหาย
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select("id")
      .eq("product_id", id);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const hasOrders = (orderItems?.length || 0) > 0;
    if (hasOrders) {
      return NextResponse.json(
        {
          hasOrders: true,
          orderCount: orderItems?.length || 0,
          warning: `หนังสือเล่มนี้มีคำสั่งซื้อแล้ว (${orderItems?.length} รายการ) ไม่สามารถลบได้ กรุณาซ่อนหนังสือแทน`,
        },
        { status: 409 }
      );
    }

    // 2. ลบรายการหนังสือจากตาราง products
    const { error: deleteError } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        {
          error: `ไม่สามารถลบหนังสือได้: ${deleteError.message} (อาจติดข้อจำกัดประวัติคำสั่งซื้อ)`,
        },
        { status: 500 }
      );
    }

    // 3. จัดการไฟล์ใน Storage:
    // "ก่อนลบหนังสือ ถ้ามีออเดอร์ที่ซื้อเล่มนี้แล้ว ให้เตือนแอดมินและห้ามลบไฟล์ใน Storage ของเล่มนั้น"
    if (!hasOrders) {
      const files = [
        product.cover_path && { bucket: "covers", path: product.cover_path },
        product.pdf_path && { bucket: "books", path: product.pdf_path },
        product.epub_path && { bucket: "books", path: product.epub_path },
        product.preview_path && { bucket: "books", path: product.preview_path },
      ].filter((file): file is { bucket: string; path: string } => Boolean(file));
      for (const file of files) {
        const { error: removeError } = await supabaseAdmin.storage
          .from(file.bucket)
          .remove([file.path]);
        if (removeError) {
          console.error("Failed to remove product storage file", removeError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      hasOrders,
      filePreserved: hasOrders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

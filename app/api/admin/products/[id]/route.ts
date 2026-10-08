import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
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

    // 1. ตรวจสอบว่ามีคำสั่งซื้อที่ซื้อเล่มนี้แล้วหรือไม่
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select("id")
      .eq("product_id", id);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const hasOrders = (orderItems?.length || 0) > 0;
    const body = await req.json().catch(() => ({}));
    const confirmWithOrders = body?.confirmWithOrders === true;

    // ถ้ามีออเดอร์แล้ว และแอดมินยังไม่ได้กดยืนยันการลบ
    if (hasOrders && !confirmWithOrders) {
      return NextResponse.json(
        {
          hasOrders: true,
          orderCount: orderItems?.length || 0,
          warning: `หนังสือเล่มนี้มีคำสั่งซื้อแล้ว (${orderItems?.length} รายการ) หากยืนยันที่จะลบ ระบบจะห้ามลบไฟล์ PDF ใน Storage เพื่อให้ผู้ซื้อยังสามารถดาวน์โหลดได้`,
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
      // ถ้าไม่มีออเดอร์ สามารถลบไฟล์ออกจาก Storage ได้
      await supabaseAdmin.storage.from("books").remove([`${id}.pdf`]);
    } else {
      console.log(
        `Product #${id} deleted, but keeping Storage file because orders exist.`
      );
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

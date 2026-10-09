import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCoverUrl } from "@/lib/cover-url";

export async function GET() {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;

  try {
    const supabaseAdmin = createAdminClient();

    const [productsRes, categoriesRes] = await Promise.all([
      supabaseAdmin.from("products").select("*").order("id", { ascending: true }),
      supabaseAdmin.from("categories").select("*").order("id", { ascending: true }),
    ]);

    if (productsRes.error) {
      return NextResponse.json(
        { error: productsRes.error.message },
        { status: 500 }
      );
    }

    const products = (productsRes.data || []).map((product) => ({
      ...product,
      cover_url: getCoverUrl(product.cover_path),
      has_file: typeof product.pdf_path === "string" && product.pdf_path.trim().length > 0,
    }));

    return NextResponse.json({
      products,
      categories: categoriesRes.data || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;

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
      .insert({
        title: title.trim(),
        author: author?.trim() || "",
        price: numPrice,
        subtitle: subtitle?.trim() || null,
        description: description?.trim() || null,
        category_id: category_id ? Number(category_id) : null,
        is_featured: !!is_featured,
        is_published: is_published !== false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

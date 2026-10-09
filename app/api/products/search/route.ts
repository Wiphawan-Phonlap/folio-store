import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCoverUrl } from "@/lib/cover-url";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (query.length < 2) return NextResponse.json({ products: [] });

  try {
    const supabase = await createClient();
    const escapedQuery = query.replace(/[%_,]/g, (character) => `\\${character}`);
    const { data, error } = await supabase
      .from("products")
      .select("id, title, author, price, cover_path")
      .eq("is_published", true)
      .or(`title.ilike.%${escapedQuery}%,author.ilike.%${escapedQuery}%`)
      .order("id", { ascending: false })
      .limit(6);

    if (error) {
      return NextResponse.json({ error: "ค้นหาหนังสือไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({
      products: (data || []).map((product) => ({
        ...product,
        cover_url: getCoverUrl(product.cover_path),
      })),
    });
  } catch {
    return NextResponse.json({ error: "ค้นหาหนังสือไม่สำเร็จ" }, { status: 500 });
  }
}

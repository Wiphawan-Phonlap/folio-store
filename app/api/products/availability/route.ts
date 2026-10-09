import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? body.ids.map(Number).filter((id: number) => Number.isInteger(id))
    : [];
  if (!ids.length) return NextResponse.json({ unavailableIds: [] });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, is_published")
    .in("id", ids);
  if (error) return NextResponse.json({ error: "ตรวจสอบสถานะหนังสือไม่สำเร็จ" }, { status: 500 });
  const available = new Set((data || []).filter((product) => product.is_published !== false).map((product) => product.id));
  return NextResponse.json({ unavailableIds: ids.filter((id: number) => !available.has(id)) });
}

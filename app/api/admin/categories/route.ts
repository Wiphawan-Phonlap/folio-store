import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;
  const { data, error } = await createAdminClient().from("categories").select("id, name").order("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;
  const name = (await req.json()).name;
  if (typeof name !== "string" || !name.trim()) return NextResponse.json({ error: "กรุณาระบุชื่อหมวดหมู่" }, { status: 400 });
  const admin = createAdminClient();
  const { data: existing } = await admin.from("categories").select("id").ilike("name", name.trim()).maybeSingle();
  if (existing) return NextResponse.json({ error: "มีหมวดหมู่นี้อยู่แล้ว" }, { status: 409 });
  const { data, error } = await admin.from("categories").insert({ name: name.trim() }).select("id, name").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;
  const body = await req.json();
  const id = Number(body.id);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!Number.isInteger(id) || !name) return NextResponse.json({ error: "ข้อมูลหมวดหมู่ไม่ถูกต้อง" }, { status: 400 });
  const admin = createAdminClient();
  const { data: existing } = await admin.from("categories").select("id").ilike("name", name).neq("id", id).maybeSingle();
  if (existing) return NextResponse.json({ error: "มีหมวดหมู่นี้อยู่แล้ว" }, { status: 409 });
  const { data, error } = await admin.from("categories").update({ name }).eq("id", id).select("id, name").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data });
}

export async function DELETE(req: NextRequest) {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "รหัสหมวดหมู่ไม่ถูกต้อง" }, { status: 400 });
  const { error } = await createAdminClient().from("categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

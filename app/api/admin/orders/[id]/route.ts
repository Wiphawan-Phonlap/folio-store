import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase-admin";

const allowedStatuses = ["pending", "paid", "cancelled"] as const;

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;

  const id = Number((await props.params).id);
  const body = await req.json().catch(() => ({}));
  const status = body.status;
  if (!Number.isInteger(id) || !allowedStatuses.includes(status)) {
    return NextResponse.json({ error: "ข้อมูลสถานะคำสั่งซื้อไม่ถูกต้อง" }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data });
}

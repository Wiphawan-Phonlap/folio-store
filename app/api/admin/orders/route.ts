import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;

  try {
    const supabaseAdmin = createAdminClient();
    const params = req.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") || 1));
    const pageSize = 20;
    const status = params.get("status");
    const search = params.get("search")?.trim() || "";
    let matchingUserIds: string[] | null = null;
    if (search && !/^\d+$/.test(search)) {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      matchingUserIds = (usersData?.users || [])
        .filter((user) => user.email?.toLowerCase().includes(search.toLowerCase()))
        .map((user) => user.id);
      if (!matchingUserIds.length) return NextResponse.json({ orders: [], page, pageSize, total: 0 });
    }

    let query = supabaseAdmin
      .from("orders")
      .select(`
        id,
        user_id,
        total,
        status,
        created_at,
        stripe_session_id,
        order_items (
          id,
          product_id,
          title,
          price,
          qty
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (status && ["paid", "pending", "failed", "cancelled"].includes(status)) query = query.eq("status", status);
    if (search && /^\d+$/.test(search)) query = query.eq("id", Number(search));
    if (matchingUserIds) query = query.in("user_id", matchingUserIds);
    const { data: orders, error: ordersError, count } = await query;

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    // ดึงอีเมลผู้ใช้งานจากระบบ Auth เพื่อแสดงผลคู่กับคำสั่งซื้อ
    const emailMap: Record<string, string> = {};
    try {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      if (usersData?.users) {
        usersData.users.forEach((u) => {
          if (u.id && u.email) {
            emailMap[u.id] = u.email;
          }
        });
      }
    } catch (err) {
      console.warn("Could not fetch user list for order emails:", err);
    }

    const formattedOrders = (orders || []).map((order) => ({
      ...order,
      user_email: emailMap[order.user_id] || order.user_id || "ไม่พบอีเมลผู้ใช้",
    }));

    return NextResponse.json({ orders: formattedOrders, page, pageSize, total: count || 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(_req: NextRequest) {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;

  try {
    const supabaseAdmin = createAdminClient();

    // ดึงข้อมูลคำสั่งซื้อทั้งหมดพร้อมรายการหนังสือ เรียงจากใหม่สุดไปเก่าสุด
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        user_id,
        total,
        status,
        created_at,
        order_items (
          id,
          product_id,
          title,
          price,
          qty
        )
      `)
      .order("created_at", { ascending: false });

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

    return NextResponse.json({ orders: formattedOrders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

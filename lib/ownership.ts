import { createClient } from "@/lib/supabase-server";

export async function getOwnedProductIds(userId: string): Promise<number[]> {
  if (!userId) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return [];
  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, orders!inner(user_id, status)")
    .eq("orders.user_id", userId)
    .eq("orders.status", "paid");

  if (error) {
    console.error("[ownership] อ่านหนังสือที่ซื้อแล้วไม่สำเร็จ", {
      code: error.code,
      message: error.message,
    });
    return [];
  }
  return [...new Set((data || []).map((item) => item.product_id))];
}

export async function getCurrentOwnedProductIds(): Promise<number[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? getOwnedProductIds(user.id) : [];
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase-server";
import PendingOrderActions from "@/components/PendingOrderActions";
import { getCurrentOwnedProductIds } from "@/lib/ownership";

type Order = {
  id: number;
  total: number;
  status: "pending" | "paid" | "failed";
  created_at: string;
  order_items: { id: number; product_id: number; title: string; price: number; qty: number }[];
};

const statusStyles = {
  paid: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-700",
};
const statusLabels = { paid: "ชำระแล้ว", pending: "รอชำระ", failed: "ไม่สำเร็จ" };

async function OrdersContent() {
  await connection();
  const supabase = await createClient();
  const ownedIds = new Set(await getCurrentOwnedProductIds());
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, total, status, created_at, order_items(id, product_id, title, price, qty)")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <Link href="/" className="text-xs text-[#52685b]">← กลับหน้าแรก</Link>
      <h1 className="mt-3 font-serif text-2xl font-bold text-[#142d20] md:text-3xl">ประวัติคำสั่งซื้อ</h1>
      <p className="mb-6 mt-1 text-xs text-[#71877a]">รายการสั่งซื้อทั้งหมดของคุณ</p>
      {error ? <p className="text-sm text-red-600">โหลดประวัติคำสั่งซื้อไม่สำเร็จ</p> : !orders?.length ? (
        <div className="rounded-2xl border border-[#e3ece5] bg-white px-6 py-16 text-center shadow-sm">
          <p className="font-serif text-lg font-bold text-[#142d20]">ยังไม่มีคำสั่งซื้อ</p>
          <Link href="/" className="mt-5 inline-block rounded-lg bg-[#1b3b2b] px-5 py-2.5 text-xs font-semibold text-white">ไปหน้าแรก</Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {(orders as Order[]).map((order) => (
            <li key={order.id} className="rounded-2xl border border-[#e3ece5] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e3ece5] pb-3">
                <div>
                  <p className="font-bold text-[#142d20]">คำสั่งซื้อ #{order.id}</p>
                  <p className="text-[11px] text-[#71877a]">{new Date(order.created_at).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
                {(() => {
                  const alreadyOwned = order.status === "pending" && order.order_items.length > 0 && order.order_items.every((item) => ownedIds.has(Number(item.product_id)));
                  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${alreadyOwned ? "bg-slate-100 text-slate-700" : statusStyles[order.status]}`}>{alreadyOwned ? "ยกเลิกแล้ว (มีหนังสือนี้แล้ว)" : statusLabels[order.status]}</span>;
                })()}
              </div>
              <ul className="space-y-2 py-4 text-xs text-[#142d20]">
                {order.order_items.map((item) => <li key={item.id} className="flex justify-between gap-3"><span>{item.title} <span className="text-[#71877a]">× {item.qty}</span></span><span>฿{(item.price * item.qty).toLocaleString()}</span></li>)}
              </ul>
              <div className="flex items-center justify-between border-t border-[#e3ece5] pt-3 text-sm">
                <span className="text-[#71877a]">ยอดรวม</span><strong className="font-serif text-lg text-[#142d20]">฿{Number(order.total).toLocaleString()}</strong>
              </div>
              {order.status === "paid" && <Link href="/library" className="mt-4 inline-block text-xs font-semibold text-[#1b3b2b] underline">ไปห้องสมุดของฉัน →</Link>}
              {order.status === "pending" && !order.order_items.every((item) => ownedIds.has(Number(item.product_id))) && <PendingOrderActions orderId={order.id} />}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function OrdersPage() {
  return <div className="min-h-screen bg-[#F6FBF5]"><Header /><Suspense fallback={<main className="p-8 text-center text-xs text-[#71877a]">กำลังโหลด...</main>}><OrdersContent /></Suspense></div>;
}

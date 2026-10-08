"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase-browser";

const coverColors = ["#1b3b2b", "#542b1a", "#233748", "#4a1e2b"];

export default function CartPage() {
  const router = useRouter();
  const { items, count, total, setQty, removeItem, clear } = useCart();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);

  async function handleCheckout() {
    setError("");
    setPlacing(true);
    const supabase = createClient();

    // ต้องล็อกอินก่อนสั่งซื้อ
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setPlacing(false);
      router.push("/login");
      return;
    }

    // สร้างออเดอร์สถานะ pending
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userData.user.id,
        total,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Failed to create order:", orderError);
      setError("สั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setPlacing(false);
      return;
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id,
        product_id: Number(i.id),
        title: i.title,
        price: i.price,
        qty: i.qty,
      }))
    );

    if (itemsError) {
      console.error("Failed to save order items:", itemsError);
      setError("บันทึกรายการหนังสือไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setPlacing(false);
      return;
    }

    // เรียก API route เพื่อสร้าง Stripe Checkout Session
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error || "สร้างรายการชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        setPlacing(false);
        return;
      }

      // ล้างตะกร้าและ redirect ไปหน้าชำระเงินของ Stripe
      clear();
      setOrderId(order.id);
      window.location.href = data.url;
    } catch (err: unknown) {
      console.error("Checkout request failed:", err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
      setPlacing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6FBF5] text-[#1A2E22]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <Link
          href="/"
          className="text-xs font-medium text-[#52685b] hover:text-[#1b3b2b]"
        >
          ← กลับไปเลือกหนังสือ
        </Link>

        <div className="mb-6 mt-3 flex items-end justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#142d20] md:text-3xl">
              ตะกร้าสินค้า
            </h1>
            <p className="mt-1 text-xs text-[#71877a]">
              {count > 0
                ? `${count} เล่มในตะกร้าของคุณ`
                : "เริ่มสะสมวรรณกรรมคัดสรรของคุณ"}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={clear}
              className="text-xs text-[#71877a] hover:text-red-600"
            >
              ล้างตะกร้า
            </button>
          )}
        </div>

        {orderId !== null ? (
          <div className="rounded-2xl border border-[#e3ece5] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1b3b2b] text-xl text-white">
              ✓
            </div>
            <p className="font-serif text-lg font-bold text-[#142d20]">
              สั่งซื้อสำเร็จ
            </p>
            <p className="mt-1 text-xs text-[#71877a]">
              หมายเลขคำสั่งซื้อ #{orderId}
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-lg bg-[#1b3b2b] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#142d20]"
            >
              กลับไปเลือกหนังสือต่อ
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-[#e3ece5] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mb-3 text-4xl">📚</div>
            <p className="font-serif text-lg font-bold text-[#142d20]">
              ตะกร้ายังว่างอยู่
            </p>
            <p className="mb-6 mt-1 text-xs text-[#71877a]">
              เลือกหนังสือที่ถูกใจแล้วกด ＋ เพื่อเพิ่มลงตะกร้า
            </p>
            <Link
              href="/"
              className="inline-block rounded-lg bg-[#1b3b2b] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#142d20]"
            >
              สำรวจหนังสือทั้งหมด
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* รายการสินค้า */}
            <ul className="space-y-3 lg:col-span-8">
              {items.map((item) => {
                const color =
                  coverColors[(Number(item.id) || 0) % coverColors.length];
                return (
                  <li
                    key={item.id}
                    className="flex gap-4 rounded-xl border border-[#e3ece5] bg-white p-3 transition hover:border-[#1b3b2b]"
                  >
                    <div
                      className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg p-2 text-center"
                      style={{ backgroundColor: color }}
                    >
                      <span className="font-serif text-[10px] italic leading-tight text-white">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#142d20]">
                            {item.title}
                          </p>
                          <p className="text-xs text-[#71877a]">
                            ฿{item.price.toLocaleString()} ต่อเล่ม
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          aria-label={`ลบ ${item.title}`}
                          className="text-xs text-[#71877a] hover:text-red-600"
                        >
                          ลบ
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 rounded-full bg-[#f0f5f0] p-1">
                          <button
                            onClick={() => setQty(item.id, item.qty - 1)}
                            aria-label="ลดจำนวน"
                            className="h-6 w-6 rounded-full text-sm text-[#1b3b2b] hover:bg-[#1b3b2b] hover:text-white"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-[#142d20]">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => setQty(item.id, item.qty + 1)}
                            aria-label="เพิ่มจำนวน"
                            className="h-6 w-6 rounded-full text-sm text-[#1b3b2b] hover:bg-[#1b3b2b] hover:text-white"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm font-bold text-[#1b3b2b]">
                          ฿{(item.price * item.qty).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* สรุปคำสั่งซื้อ */}
            <aside className="lg:col-span-4">
              <div className="rounded-2xl bg-[#1b3b2b] p-5 text-white shadow-sm lg:sticky lg:top-6">
                <div className="mb-4 text-xs font-semibold text-[#C5A059]">
                  ❖ สรุปคำสั่งซื้อ
                </div>

                <div className="space-y-2 text-xs text-[#c6d8cc]">
                  <div className="flex justify-between">
                    <span>จำนวนหนังสือ</span>
                    <span>{count} เล่ม</span>
                  </div>
                  <div className="flex justify-between">
                    <span>การจัดส่ง</span>
                    <span>ไฟล์ดิจิทัล (ฟรี)</span>
                  </div>
                </div>

                <div className="my-4 flex items-end justify-between border-t border-[#294b37] pt-4">
                  <span className="text-xs text-[#a3b8ac]">ยอดรวมทั้งหมด</span>
                  <span className="font-serif text-2xl font-bold">
                    ฿{total.toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={placing}
                  className="w-full rounded-lg bg-[#C5A059] py-2.5 text-xs font-bold text-[#142d20] hover:bg-[#d4af37] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {placing ? "กำลังไปหน้าชำระเงิน..." : "สั่งซื้อ"}
                </button>

                {error && (
                  <p className="mt-3 text-center text-xs text-red-300">
                    {error}
                  </p>
                )}

                <p className="mt-3 text-center text-[10px] text-[#a3b8ac]">
                  ไฟล์ EPUB &amp; PDF ต้นฉบับ • ไร้ DRM
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
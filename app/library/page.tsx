"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase-browser";

type OrderItem = {
  id: number;
  product_id: number;
  title: string;
  price: number;
  qty: number;
};

type Order = {
  id: number;
  total: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
};

export default function LibraryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [error, setError] = useState("");
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [dlError, setDlError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setLoggedIn(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, total, status, created_at, order_items(id, product_id, title, price, qty)"
        )
        .order("created_at", { ascending: false });

      if (error) {
        setError("โหลดประวัติคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      } else {
        setOrders((data as Order[]) ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleDownload(productId: number, key: string) {
    setDownloadingKey(key);
    setDlError("");
    const supabase = createClient();

    const { data, error } = await supabase.storage
      .from("books")
      .createSignedUrl(`${productId}.pdf`, 60, { download: true });

    setDownloadingKey(null);

    if (error || !data) {
      setDlError(
        "ดาวน์โหลดไม่สำเร็จ ไฟล์อาจยังไม่ถูกอัปโหลด กรุณาลองใหม่ภายหลัง"
      );
      return;
    }
    window.location.href = data.signedUrl;
  }

  function statusLabel(status: string) {
    if (status === "pending") return "รอชำระเงิน";
    if (status === "paid") return "ชำระเงินแล้ว";
    return status;
  }

  return (
    <div className="min-h-screen bg-[#F6FBF5] text-[#1A2E22]">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <Link
          href="/"
          className="text-xs font-medium text-[#52685b] hover:text-[#1b3b2b]"
        >
          ← กลับหน้าแรก
        </Link>

        <h1 className="mb-1 mt-3 font-serif text-2xl font-bold text-[#142d20] md:text-3xl">
          ห้องสมุดของฉัน
        </h1>
        <p className="mb-6 text-xs text-[#71877a]">
          ประวัติคำสั่งซื้อและไฟล์หนังสือของคุณ
        </p>

        {dlError && <p className="mb-4 text-xs text-red-600">{dlError}</p>}

        {loading ? (
          <p className="text-sm text-[#71877a]">กำลังโหลด...</p>
        ) : !loggedIn ? (
          <div className="rounded-2xl border border-[#e3ece5] bg-white px-6 py-16 text-center shadow-sm">
            <p className="font-serif text-lg font-bold text-[#142d20]">
              กรุณาเข้าสู่ระบบ
            </p>
            <p className="mb-6 mt-1 text-xs text-[#71877a]">
              เข้าสู่ระบบเพื่อดูหนังสือที่คุณเคยสั่งซื้อ
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-[#1b3b2b] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#142d20]"
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-[#e3ece5] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mb-3 text-4xl">📖</div>
            <p className="font-serif text-lg font-bold text-[#142d20]">
              ยังไม่มีคำสั่งซื้อ
            </p>
            <p className="mb-6 mt-1 text-xs text-[#71877a]">
              เริ่มสะสมวรรณกรรมคัดสรรเล่มแรกของคุณ
            </p>
            <Link
              href="/"
              className="inline-block rounded-lg bg-[#1b3b2b] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#142d20]"
            >
              สำรวจหนังสือทั้งหมด
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li
                key={order.id}
                className="rounded-2xl border border-[#e3ece5] bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between border-b border-[#e3ece5] pb-3">
                  <div>
                    <p className="text-sm font-bold text-[#142d20]">
                      คำสั่งซื้อ #{order.id}
                    </p>
                    <p className="text-[11px] text-[#71877a]">
                      {new Date(order.created_at).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      order.status === "paid"
                        ? "bg-[#1b3b2b] text-white"
                        : "bg-[#f0f5f0] text-[#1b3b2b]"
                    }`}
                  >
                    {statusLabel(order.status)}
                  </span>
                </div>

                <ul className="space-y-2.5">
                  {order.order_items.map((item) => {
                    const key = `${order.id}-${item.id}`;
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="min-w-0 flex-1 truncate text-[#142d20]">
                          {item.title}
                          <span className="text-[#71877a]"> × {item.qty}</span>
                        </span>

                        {order.status === "paid" && (
                          <button
                            onClick={() => handleDownload(item.product_id, key)}
                            disabled={downloadingKey === key}
                            className="rounded-lg bg-[#C5A059] px-3 py-1 text-[11px] font-bold text-[#142d20] hover:bg-[#d4af37] disabled:opacity-60"
                          >
                            {downloadingKey === key
                              ? "กำลังเตรียมไฟล์..."
                              : "ดาวน์โหลด"}
                          </button>
                        )}

                        <span className="w-16 text-right font-semibold text-[#1b3b2b]">
                          ฿{(item.price * item.qty).toLocaleString()}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-3 flex items-center justify-between border-t border-[#e3ece5] pt-3">
                  <span className="text-xs text-[#71877a]">ยอดรวม</span>
                  <span className="text-lg font-bold text-[#142d20]">
                    ฿{order.total.toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
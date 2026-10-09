"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useCart } from "@/lib/cart";
import { coverColor } from "@/lib/cover-colors";
import { isNativeApp, openPaymentUrl } from "@/lib/capacitor-payment";

export default function CartPage() {
  const router = useRouter();
  const { items, count, setQty, removeItem, clear, loaded } = useCart();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [ownershipNotice, setOwnershipNotice] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionInitialized = useRef(false);

  useEffect(() => {
    if (!loaded) {
      selectionInitialized.current = false;
      return;
    }
    setSelectedIds((current) => {
      const availableIds = new Set(items.map((item) => String(item.id)));
      if (!selectionInitialized.current && items.length > 0) {
        selectionInitialized.current = true;
        return availableIds;
      }

      return new Set([...current].filter((id) => availableIds.has(id)));
    });
  }, [items, loaded]);

  const selectedItems = items.filter((item) => selectedIds.has(String(item.id)));
  const selectedCount = selectedItems.reduce((sum, item) => sum + item.qty, 0);
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const allItemsSelected = items.length > 0 && selectedItems.length === items.length;

  function toggleSelected(id: string | number) {
    const key = String(id);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(allItemsSelected ? new Set() : new Set(items.map((item) => String(item.id))));
  }

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/library/owned")
        .then((response) => response.json())
        .then((data: { productIds?: number[] }) => {
          const owned = new Set(data.productIds || []);
          const removed = items.filter((item) => owned.has(Number(item.id)));
          if (removed.length > 0) {
            removed.forEach((item) => removeItem(item.id));
            setOwnershipNotice("นำหนังสือที่คุณมีแล้วออกจากตะกร้าให้แล้ว");
          }
        })
        .catch((error: unknown) => console.error("ตรวจสอบหนังสือที่มีแล้วไม่สำเร็จ:", error));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [items, removeItem, loaded]);

  useEffect(() => {
    if (!loaded || !items.length) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/products/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: items.map((item) => Number(item.id)) }),
      })
        .then((response) => response.json())
        .then((data: { unavailableIds?: number[] }) => {
          const unavailable = new Set(data.unavailableIds || []);
          if (unavailable.size) {
            items.filter((item) => unavailable.has(Number(item.id))).forEach((item) => removeItem(item.id));
            setOwnershipNotice("นำหนังสือที่ถูกซ่อนออกจากตะกร้าให้แล้ว");
          }
        })
        .catch((error: unknown) => console.error("ตรวจสอบหนังสือที่เผยแพร่ไม่สำเร็จ:", error));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [items, removeItem, loaded]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[#F6FBF5] text-[#1A2E22]">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-[#71877a] md:px-8">
          กำลังโหลดตะกร้า...
        </main>
      </div>
    );
  }

  async function handleCheckout() {
    setError("");
    if (selectedItems.length === 0) {
      setError("กรุณาเลือกหนังสืออย่างน้อย 1 เล่มเพื่อชำระเงิน");
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch("/api/checkout/direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: selectedItems.map((item) => ({ productId: Number(item.id), quantity: item.qty })),
          native: isNativeApp(),
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setPlacing(false);
        router.push(`/login?next=${encodeURIComponent("/cart")}`);
        return;
      }

      if (!res.ok || !data.url) {
        setError(data.error || "สร้างรายการชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        setPlacing(false);
        return;
      }

      localStorage.setItem(`folio-pending-cart:${data.orderId}`, JSON.stringify(selectedItems.map((item) => String(item.id))));
      await openPaymentUrl(data.url);
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
                ? `${count} เล่มในตะกร้าของคุณ · เลือกชำระ ${selectedCount} เล่ม`
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

        {items.length === 0 ? (
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
              <li className="flex items-center gap-2 text-xs text-[#52685b]">
                <input
                  type="checkbox"
                  checked={allItemsSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-[#dce6de] text-[#1b3b2b] focus:ring-[#1b3b2b]"
                />
                <span>เลือกหนังสือทั้งหมด</span>
              </li>
              {items.map((item) => {
                const color = coverColor(Number(item.id) || 0);
                const isSelected = selectedIds.has(String(item.id));
                return (
                  <li
                    key={item.id}
                    className={`flex gap-4 rounded-xl border bg-white p-3 transition hover:border-[#1b3b2b] ${
                      isSelected ? "border-[#1b3b2b]" : "border-[#e3ece5]"
                    }`}
                  >
                    <div className="flex items-start pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(item.id)}
                        aria-label={`เลือก ${item.title} เพื่อชำระเงิน`}
                        className="h-4 w-4 rounded border-[#dce6de] text-[#1b3b2b] focus:ring-[#1b3b2b]"
                      />
                    </div>
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
                    <span>{selectedCount} เล่ม</span>
                  </div>
                  <div className="flex justify-between">
                    <span>การจัดส่ง</span>
                    <span>ไฟล์ดิจิทัล (ฟรี)</span>
                  </div>
                </div>

                <div className="my-4 flex items-end justify-between border-t border-[#294b37] pt-4">
                  <span className="text-xs text-[#a3b8ac]">ยอดรวมทั้งหมด</span>
                  <span className="font-serif text-2xl font-bold">
                    ฿{selectedTotal.toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={placing || selectedItems.length === 0}
                  className="w-full rounded-lg bg-[#C5A059] py-2.5 text-xs font-bold text-[#142d20] hover:bg-[#d4af37] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {placing ? "กำลังไปหน้าชำระเงิน..." : selectedItems.length === 0 ? "เลือกหนังสือเพื่อชำระ" : "สั่งซื้อ"}
                </button>

                {error && (
                  <p className="mt-3 text-center text-xs text-red-300">
                    {error}
                  </p>
                )}
                {ownershipNotice && <p className="mt-4 text-xs text-[#1b3b2b]">{ownershipNotice}</p>}

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
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";

export default function CheckoutSuccessActions({
  orderId,
  sessionId,
  confirmed,
}: {
  orderId: number;
  sessionId: string;
  confirmed: boolean;
}) {
  const router = useRouter();
  const { removeItem, loaded } = useCart();
  const [isConfirmed, setIsConfirmed] = useState(confirmed);

  useEffect(() => {
    let cancelled = false;

    async function removePurchasedItems() {
      const pendingKey = `folio-pending-cart:${orderId}`;
      const pendingCart = localStorage.getItem(pendingKey);
      if (!pendingCart) return;

      try {
        const purchasedIds = JSON.parse(pendingCart) as string[];
        purchasedIds.forEach((id) => removeItem(id));
        localStorage.removeItem(pendingKey);
      } catch (error: unknown) {
        console.error("[checkout-success] Failed to remove purchased cart items", error);
      }
    }

    async function confirmPayment() {
      if (!loaded) return;
      if (confirmed) {
        await removePurchasedItems();
        return;
      }

      for (let attempt = 0; attempt < 6 && !cancelled; attempt += 1) {
        try {
          const response = await fetch("/api/stripe/verify-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const data = await response.json().catch(() => null) as { status?: string } | null;
          if (response.ok && data?.status === "paid") {
            if (!cancelled) {
              setIsConfirmed(true);
              await removePurchasedItems();
              router.refresh();
            }
            return;
          }
        } catch (error: unknown) {
          console.error("[checkout-success] Payment confirmation retry failed", error);
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }
    }

    void confirmPayment();
    return () => {
      cancelled = true;
    };
  }, [confirmed, loaded, orderId, removeItem, router, sessionId]);

  return (
    <>
      {!isConfirmed && (
        <p className="mb-5 rounded-xl border border-[#ead9a9] bg-[#fffaf0] px-4 py-3 text-sm text-[#806b2d]">
          กำลังยืนยันการชำระเงิน กรุณารอสักครู่...
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/orders" className="rounded-lg bg-[#1b3b2b] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#142d20]">
          ดูประวัติการสั่งซื้อ
        </Link>
        <Link href="/library" className="rounded-lg border border-[#C5A059] px-5 py-2.5 text-xs font-semibold text-[#1b3b2b]">
          ไปห้องสมุดของฉัน
        </Link>
        <Link href="/" className="rounded-lg border border-[#e3ece5] px-5 py-2.5 text-xs font-semibold text-[#52685b]">
          กลับหน้าแรก
        </Link>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function BuyNowButton({
  productId,
  title,
  owned = false,
}: {
  productId: number;
  title: string;
  owned?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const resetLoading = () => setLoading(false);
    window.addEventListener("pageshow", resetLoading);
    return () => window.removeEventListener("pageshow", resetLoading);
  }, []);

  if (owned) {
    return <Link href="/library" className="rounded-lg border border-[#C5A059] px-4 py-2 text-xs font-semibold text-[#1b3b2b]">ไปห้องสมุดของฉัน</Link>;
  }

  async function buyNow() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/checkout/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ productId, quantity: 1 }] }),
      });
      const data = await response.json();
      if (response.status === 401) {
        setLoading(false);
        router.push(`/login?next=${encodeURIComponent(`/books/${productId}`)}`);
        return;
      }
      if (!response.ok || !data.url) {
        setError(data.error || `ซื้อ ${title} ไม่สำเร็จ`);
        setLoading(false);
        return;
      }
      window.location.assign(data.url);
    } catch (requestError: unknown) {
      console.error("Buy now request failed:", requestError);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={() => void buyNow()} disabled={loading} className="rounded-lg bg-[#C5A059] px-4 py-2 text-xs font-semibold text-[#142d20] disabled:opacity-60">
        {loading ? "กำลังไปหน้าชำระเงิน..." : "ซื้อเลย"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

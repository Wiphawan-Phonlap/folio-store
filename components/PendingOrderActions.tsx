"use client";

import { useState } from "react";
import { isNativeApp, openPaymentUrl } from "@/lib/capacitor-payment";

export default function PendingOrderActions({ orderId }: { orderId: number }) {
  const [loading, setLoading] = useState<"pay" | "cancel" | null>(null);
  const [error, setError] = useState("");

  async function pay() {
    setLoading("pay"); setError("");
    const response = await fetch(`/api/orders/${orderId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ native: isNativeApp() }),
    });
    const data = await response.json();
    setLoading(null);
    if (!response.ok || !data.url) { setError(data.error || "ไม่สามารถเปิดหน้าชำระเงินได้"); return; }
    await openPaymentUrl(data.url);
  }

  async function cancel() {
    if (!window.confirm("ต้องการยกเลิกคำสั่งซื้อนี้หรือไม่?")) return;
    setLoading("cancel"); setError("");
    const response = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) { setLoading(null); setError(data.error || "ยกเลิกคำสั่งซื้อไม่สำเร็จ"); return; }
    window.location.reload();
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => void pay()} disabled={loading !== null} className="rounded-lg bg-[#1b3b2b] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
          {loading === "pay" ? "กำลังเปิด..." : "ชำระเงินต่อ"}
        </button>
        <button onClick={() => void cancel()} disabled={loading !== null} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60">
          {loading === "cancel" ? "กำลังยกเลิก..." : "ยกเลิกคำสั่งซื้อ"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

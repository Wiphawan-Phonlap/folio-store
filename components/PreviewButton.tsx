"use client";

import { useState } from "react";

export default function PreviewButton({ productId, available }: { productId: number; available: boolean }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!available) return <p className="mt-3 text-xs text-[#71877A]">ยังไม่มีตัวอย่าง</p>;

  async function openPreview() {
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/books/${productId}/preview`);
    const data = await response.json();
    setLoading(false);
    if (!response.ok || !data.url) {
      setMessage(data.error || "เปิดตัวอย่างไม่สำเร็จ");
      return;
    }
    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-3">
      <button onClick={() => void openPreview()} disabled={loading} className="rounded-lg border border-[#D0DCD2] px-4 py-2 text-xs font-semibold text-[#1B3B2B] hover:bg-[#F6FBF5] disabled:opacity-60">
        {loading ? "กำลังเปิด..." : "เปิดตัวอย่างอ่าน"}
      </button>
      {message && <p className="mt-2 text-xs text-red-600">{message}</p>}
    </div>
  );
}

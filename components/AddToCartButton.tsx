"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";

type Props = {
  product: { id: number; title: string; price: number };
  owned?: boolean;
};

export default function AddToCartButton({ product, owned = false }: Props) {
  const { addItem, items, loaded } = useCart();
  const [added, setAdded] = useState(false);
  const inCart = items.some((item) => Number(item.id) === product.id);

  if (owned) {
    return (
      <Link href="/library" className="rounded bg-[#e8efe9] px-2.5 py-1 text-[11px] font-semibold text-[#1b3b2b]">
        อยู่ในห้องสมุดแล้ว
      </Link>
    );
  }

  if (inCart) {
    return (
      <Link href="/cart" className="rounded bg-[#f0f5f0] px-2.5 py-1 text-[11px] font-semibold text-[#1b3b2b]">
        อยู่ในตะกร้าแล้ว
      </Link>
    );
  }

  function handleClick() {
    addItem({
      id: product.id,
      title: product.title,
      price: Number(product.price),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1000);
  }

  return (
    <button
      onClick={handleClick}
      disabled={!loaded}
      aria-label={`เพิ่ม ${product.title} ลงตะกร้า`}
      className="rounded bg-[#f0f5f0] px-2 py-1 text-[#1b3b2b] hover:bg-[#1b3b2b] hover:text-white disabled:opacity-60"
    >
      {added ? "✓" : inCart ? "อยู่ในตะกร้าแล้ว" : "＋"}
    </button>
  );
}
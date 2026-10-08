"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";

type Props = {
  product: { id: number; title: string; price: number };
};

export default function AddToCartButton({ product }: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

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
      aria-label={`เพิ่ม ${product.title} ลงตะกร้า`}
      className="rounded bg-[#f0f5f0] px-2 py-1 text-[#1b3b2b] hover:bg-[#1b3b2b] hover:text-white"
    >
      {added ? "✓" : "＋"}
    </button>
  );
}
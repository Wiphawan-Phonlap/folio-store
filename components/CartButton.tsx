"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export default function CartButton() {
  const { count } = useCart();

  return (
    <Link
      href="/cart"
      className="relative rounded-lg border border-[#d0dcd2] bg-white px-4 py-2 text-[#1b3b2b] hover:bg-[#f0f5f0]"
    >
      ตะกร้า
      {count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1b3b2b] px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
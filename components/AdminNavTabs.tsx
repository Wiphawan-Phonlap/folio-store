"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNavTabs() {
  const pathname = usePathname();

  const tabs = [
    { name: "จัดการหนังสือ (Products)", href: "/admin/products", icon: "📚" },
    { name: "คำสั่งซื้อทั้งหมด (Orders)", href: "/admin/orders", icon: "🧾" },
  ];

  return (
    <nav className="flex space-x-1 overflow-x-auto border-b border-[#e3ece5] text-xs font-medium">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 border-b-2 transition ${
              isActive
                ? "border-[#C5A059] text-[#142d20] font-bold bg-[#f3f8f4]"
                : "border-transparent text-[#71877a] hover:border-gray-300 hover:text-[#142d20]"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

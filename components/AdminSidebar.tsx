"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

const links = [
  { href: "/admin", label: "แดชบอร์ด", icon: "▦" },
  { href: "/admin/products", label: "หนังสือ", icon: "▤" },
  { href: "/admin/orders", label: "คำสั่งซื้อ", icon: "▣" },
  { href: "/admin/categories", label: "หมวดหมู่", icon: "◫" },
];

export default function AdminSidebar({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const content = (
    <aside className="flex h-full w-64 flex-col bg-[#1B3B2B] p-5 text-white">
      <div className="mb-10 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-[#C5A059] font-serif text-xl font-bold text-[#142D20]">
          F
        </span>
        <div>
          <p className="font-serif text-lg font-bold">Folio &amp; Co.</p>
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#A3B8AC]">Admin portal</p>
        </div>
      </div>

      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8FA99A]">
        จัดการร้านค้า
      </p>
      <nav className="space-y-1">
        {links.map((link) => {
          const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active ? "bg-[#C5A059] font-semibold text-[#142D20]" : "text-[#D9E5DB] hover:bg-[#284D39]"
              }`}
            >
              <span className="w-5 text-center">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-[#3B5D49] pt-5">
        <p className="truncate text-[10px] text-[#A3B8AC]" title={email || undefined}>
          ผู้ดูแล: {email || "ผู้ดูแลระบบ"}
        </p>
        <Link href="/" className="block rounded-lg border border-[#3B5D49] px-3 py-2 text-center text-xs text-[#D9E5DB] hover:bg-[#284D39]">
          ← กลับไปหน้าร้าน
        </Link>
        <button onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#D9E5DB] hover:bg-[#284D39]">
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <button
        type="button"
        aria-label="เปิดเมนูผู้ดูแลระบบ"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-lg bg-[#1B3B2B] p-2 text-white shadow md:hidden"
      >
        ☰
      </button>
      <div className={`fixed inset-0 z-40 md:hidden ${open ? "block" : "hidden"}`}>
        <button aria-label="ปิดเมนู" onClick={() => setOpen(false)} className="absolute inset-0 bg-[#142D20]/50" />
        <div className="relative h-full">{content}</div>
      </div>
      <div className="hidden h-screen shrink-0 md:block">{content}</div>
    </>
  );
}

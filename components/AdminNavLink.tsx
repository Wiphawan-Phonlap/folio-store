"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function AdminNavLink() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const res = await fetch("/api/admin/check", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(!!data.isAdmin);
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      }
    }

    checkAdminStatus();

    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1 rounded-lg border border-[#C5A059] bg-[#1b3b2b] px-2.5 py-1.5 text-xs font-semibold text-[#C5A059] transition hover:bg-[#142d20] hover:text-white"
      title="ไปยังแดชบอร์ดผู้ดูแลระบบ"
    >
      <span>⚙️</span>
      <span>แดชบอร์ดแอดมิน</span>
    </Link>
  );
}

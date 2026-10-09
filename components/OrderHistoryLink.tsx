"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function OrderHistoryLink() {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setLoggedIn(Boolean(data.user)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setLoggedIn(Boolean(session?.user)));
    return () => listener.subscription.unsubscribe();
  }, []);
  if (!loggedIn) return null;
  return <Link href="/orders" className="hidden hover:text-[#1b3b2b] md:block">ประวัติคำสั่งซื้อ</Link>;
}

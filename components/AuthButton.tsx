"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-browser";

export default function AuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!ready) {
    return <div className="h-9 w-24" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-[#1b3b2b] px-4 py-2 text-white hover:bg-[#142d20]"
      >
        เข้าสู่ระบบ
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-[140px] truncate text-[#52685b] sm:block">
        {user.email}
      </span>
      <button
        onClick={handleLogout}
        className="rounded-lg border border-[#d0dcd2] bg-white px-4 py-2 text-[#1b3b2b] hover:bg-[#f0f5f0]"
      >
        ออกจากระบบ
      </button>
    </div>
  );
}
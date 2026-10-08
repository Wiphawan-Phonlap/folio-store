"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        setMessage("สมัครสำเร็จ กรุณาเช็คอีเมลเพื่อยืนยันบัญชี");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      } else {
        router.push("/");
        router.refresh();
      }
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#e3ece5] bg-white p-8 shadow-sm">
        <Link href="/" className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-[#1b3b2b] font-serif text-lg font-bold text-[#f6fbf5]">
            F
          </div>
          <span className="font-serif text-xl font-bold text-[#142d20]">
            Folio &amp; Co.
          </span>
        </Link>

        <h1 className="mb-1 text-lg font-bold text-[#142d20]">
          {mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
        </h1>
        <p className="mb-5 text-xs text-[#71877a]">
          {mode === "login"
            ? "ยินดีต้อนรับกลับ เข้าห้องสมุดของคุณ"
            : "สร้างบัญชีเพื่อเริ่มสะสมหนังสือ"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="อีเมล"
            className="w-full rounded-lg border border-[#dce6de] bg-[#f0f5f0] px-4 py-2.5 text-sm outline-none focus:border-[#1b3b2b] focus:bg-white"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
            className="w-full rounded-lg border border-[#dce6de] bg-[#f0f5f0] px-4 py-2.5 text-sm outline-none focus:border-[#1b3b2b] focus:bg-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#1b3b2b] py-2.5 text-sm font-semibold text-white hover:bg-[#142d20] disabled:opacity-60"
          >
            {loading
              ? "กำลังดำเนินการ..."
              : mode === "login"
              ? "เข้าสู่ระบบ"
              : "สมัครสมาชิก"}
          </button>
        </form>

        {message && <p className="mt-3 text-xs text-red-600">{message}</p>}

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage("");
          }}
          className="mt-5 w-full text-center text-xs text-[#52685b] hover:text-[#1b3b2b]"
        >
          {mode === "login"
            ? "ยังไม่มีบัญชี? สมัครสมาชิก"
            : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
        </button>
      </div>
    </main>
  );
}
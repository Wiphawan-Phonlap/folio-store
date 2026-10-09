"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A10.6 10.6 0 0 1 12 5c5.1 0 8.5 4.5 9.5 7-.4 1-1.3 2.4-2.7 3.7M6.2 6.3C3.9 7.8 2.9 10.1 2.5 12c.7 1.7 2.3 4.2 5.6 5.8A10.7 10.7 0 0 0 12 19c.8 0 1.6-.1 2.3-.3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.4-7 9.5-7 9.5 7 9.5 7-3.4 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let settled = false;
    let recoveryEventReceived = false;

    const finish = (valid: boolean) => {
      if (!active || settled) return;
      settled = true;
      setStatus(valid ? "ready" : "invalid");
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        recoveryEventReceived = true;
        finish(true);
      }
    });

    async function establishRecoverySession() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const linkType = params.get("type");
      const errorCode = params.get("error_code") || params.get("error");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hasImplicitRecoveryToken = hashParams.has("access_token") || hashParams.get("type") === "recovery";

      if (errorCode === "otp_expired" || errorCode === "access_denied") {
        finish(false);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          finish(false);
          return;
        }
      } else if (tokenHash && linkType === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (error) {
          finish(false);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if ((code || tokenHash || hasImplicitRecoveryToken) && data.session) {
        finish(true);
      } else if (recoveryEventReceived) {
        finish(true);
      } else {
        window.setTimeout(() => finish(false), 1500);
      }
    }

    void establishRecoverySession();
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      setMessage("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
      return;
    }

    setLoading(true);
    setMessage("");
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      const text = error.message.toLowerCase();
      setMessage(text.includes("same") || text.includes("different") ? "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม" : text.includes("weak") || text.includes("short") ? "รหัสผ่านอ่อนเกินไป กรุณาใช้รหัสผ่านที่ปลอดภัยกว่านี้" : "ไม่สามารถตั้งรหัสผ่านใหม่ได้ กรุณาขอลิงก์ใหม่อีกครั้ง");
    } else {
      setSuccess(true);
      setMessage("ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว");
      await createClient().auth.signOut();
      router.push("/login?reset=success");
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6FBF5] px-4 py-10 text-[#142D20]">
      <section className="w-full max-w-md rounded-2xl border border-[#E3ECE5] bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="font-serif text-xl font-bold text-[#1B3B2B]">Folio &amp; Co.</Link>
        <h1 className="mt-8 font-serif text-2xl font-bold">ตั้งรหัสผ่านใหม่</h1>
        {status === "checking" ? (
          <p className="mt-3 text-sm text-[#71877A]">กำลังตรวจสอบลิงก์...</p>
        ) : status === "invalid" ? (
          <div className="mt-4 text-sm text-[#71877A]">
            <p>ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว</p>
            <Link href="/login?forgot=1" className="mt-5 inline-block rounded-lg bg-[#1B3B2B] px-4 py-2 text-xs font-semibold text-white">ขอลิงก์ใหม่</Link>
          </div>
        ) : success ? (
          <p className="mt-4 text-sm text-emerald-700">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-xs font-semibold text-[#52685B]">
              รหัสผ่านใหม่
              <span className="relative mt-1.5 block">
                <input type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[#E3ECE5] bg-[#F6FBF5] px-4 py-3 pr-11 text-sm outline-none focus:border-[#1B3B2B]" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71877A]" aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}><EyeIcon hidden={!showPassword} /></button>
              </span>
            </label>
            <label className="block text-xs font-semibold text-[#52685B]">
              ยืนยันรหัสผ่านใหม่
              <span className="relative mt-1.5 block">
                <input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-[#E3ECE5] bg-[#F6FBF5] px-4 py-3 pr-11 text-sm outline-none focus:border-[#1B3B2B]" />
                <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71877A]" aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}><EyeIcon hidden={!showConfirmPassword} /></button>
              </span>
            </label>
            {message && <p className="text-xs text-red-600">{message}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#1B3B2B] py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}</button>
          </form>
        )}
      </section>
    </main>
  );
}

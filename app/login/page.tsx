"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { getSafeRedirectPath } from "@/lib/auth-redirect";

type AuthMode = "login" | "signup";

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

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [forgotSentEmail, setForgotSentEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [emailUnconfirmed, setEmailUnconfirmed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; displayName?: string }>({});
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);

  const nextPath = getSafeRedirectPath(
    typeof window !== "undefined"
      ? (() => {
          const params = new URLSearchParams(window.location.search);
          return params.get("next") || params.get("redirect");
        })()
      : null
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(nextPath);
    });
  }, [nextPath, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("forgot") === "1") {
        setForgotPassword(true);
      }
      if (params.get("reset") === "success") {
        setMessageType("success");
        setMessage("เข้าสู่ระบบด้วยรหัสผ่านใหม่ของคุณ");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    emailRef.current?.focus();
  }, [mode, forgotPassword]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = window.setTimeout(() => setForgotCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [forgotCooldown]);

  function showError(text: string) {
    setMessageType("error");
    setMessage(text);
  }

  function switchMode(nextMode: AuthMode) {
    setForgotPassword(false);
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    setFieldErrors({});
    setEmailUnconfirmed(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setEmailUnconfirmed(false);
    setFieldErrors({});

    const errors: typeof fieldErrors = {};
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "กรุณากรอกอีเมลให้ถูกต้อง";
    }
    if (password.length < 6) {
      errors.password = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    }
    if (mode === "signup" && !displayName.trim()) {
      errors.displayName = "กรุณากรอกชื่อที่แสดง";
    }
    if (mode === "signup" && password !== confirmPassword) {
      errors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showError("กรุณาตรวจสอบข้อมูลที่กรอก");
      setLoading(false);
      return;
    }
    if (mode === "signup" && !acceptedTerms) {
      showError("กรุณายอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (error) {
        showError("ไม่สามารถสมัครสมาชิกได้ กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง");
      } else if (data.session) {
        router.push(nextPath);
        router.refresh();
      } else {
        setMessageType("success");
        setMessage("เราส่งลิงก์ยืนยันไปที่อีเมลแล้ว");
        setEmailUnconfirmed(true);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (error.code === "email_not_confirmed") {
          showError("กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ");
          setEmailUnconfirmed(true);
        } else {
          showError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        }
      } else {
        if (!data.user?.email_confirmed_at && data.user?.email) {
          showError("กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ");
          setEmailUnconfirmed(true);
          setLoading(false);
          return;
        }
        router.push(nextPath);
        router.refresh();
      }
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (forgotCooldown > 0) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showError("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }

    setLoading(true);
    setMessage("");
    const { error } = await createClient().auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/update-password?flow=recovery`,
    });
    if (error) {
      if (error.code === "over_email_send_rate_limit" || error.status === 429) {
        showError("ขอลิงก์บ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่");
      } else {
        showError("ไม่สามารถส่งลิงก์ได้ กรุณาลองใหม่อีกครั้ง");
      }
    } else {
      setForgotSentEmail(normalizedEmail);
      setMessageType("success");
      setMessage("ถ้าอีเมลนี้มีบัญชี เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว กรุณาตรวจสอบกล่องจดหมาย (รวมถึงสแปม)");
      setForgotCooldown(60);
    }
    setLoading(false);
  }

  function openForgotPassword() {
    setForgotPassword(true);
    setMessage("");
    setMessageType("error");
    setPassword("");
    setConfirmPassword("");
    setFieldErrors({});
    setEmailUnconfirmed(false);
  }

  async function handleResendConfirmation() {
    if (resendCooldown > 0 || !email.trim()) return;
    setLoading(true);
    const { error } = await createClient().auth.resend({ type: "signup", email });
    if (error) {
      showError("ไม่สามารถส่งอีเมลยืนยันได้ กรุณาลองใหม่อีกครั้ง");
    } else {
      setMessageType("success");
      setMessage("หากบัญชีนี้ยังไม่ได้ยืนยัน เราได้ส่งอีเมลยืนยันอีกครั้งแล้ว");
    }
    setResendCooldown(60);
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setMessage("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      showError("ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <main className="min-h-screen bg-[#F6FBF5] p-0 text-[#142D20] sm:p-6 lg:p-10">
      <div className="mx-auto flex min-h-screen max-w-6xl overflow-hidden bg-white shadow-none sm:min-h-0 sm:rounded-[12px] sm:shadow-[0_24px_70px_rgba(20,45,32,0.1)] lg:min-h-[min(760px,calc(100vh-80px))]">
        <section className="relative hidden w-[44%] overflow-hidden bg-[#1B3B2B] p-10 text-[#F6FBF5] lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_18%_20%,rgba(197,160,89,0.32)_0_1px,transparent_1px),radial-gradient(circle_at_80%_70%,rgba(246,251,245,0.18)_0_1px,transparent_1px)] [background-size:28px_28px,42px_42px]" />
          <div className="pointer-events-none absolute -right-24 top-28 h-80 w-56 rotate-[14deg] rounded-[4px] border border-[#C5A059]/30 shadow-[18px_18px_0_rgba(197,160,89,0.08),36px_36px_0_rgba(246,251,245,0.06)]" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-52 -rotate-[18deg] rounded-[4px] border border-[#F6FBF5]/15" />

          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[4px] bg-[#C5A059] font-serif text-2xl font-bold text-[#1B3B2B]">
                F
              </span>
              <span className="font-serif text-2xl font-bold tracking-tight">
                Folio &amp; Co.
              </span>
            </Link>
            <p className="mt-2 pl-14 text-[10px] uppercase tracking-[0.25em] text-[#C5A059]">
              Curated literary e-books
            </p>
          </div>

          <div className="relative max-w-sm">
            <div className="mb-5 h-px w-12 bg-[#C5A059]" />
            <blockquote className="font-serif text-3xl leading-tight text-[#F6FBF5]">
              “หนังสือที่ดี
              <br />
              จะอยู่กับเรา
              <br />
              ไปอีกนาน”
            </blockquote>
            <p className="mt-5 text-xs leading-6 text-[#B7C9BC]">
              พื้นที่เล็ก ๆ สำหรับเรื่องเล่าที่คัดสรรอย่างตั้งใจ
              และห้องสมุดดิจิทัลที่เป็นของคุณ
            </p>
          </div>

          <p className="relative text-[10px] tracking-[0.2em] text-[#8FA99A]">
            EST. 1924 · BANGKOK
          </p>
        </section>

        <section className="flex w-full items-center justify-center px-6 py-10 sm:px-12 sm:py-14 lg:w-[56%] lg:px-20">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-10 flex items-center gap-3 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-[#1B3B2B] font-serif text-xl font-bold text-[#F6FBF5]">
                F
              </span>
              <span className="font-serif text-xl font-bold text-[#142D20]">
                Folio &amp; Co.
              </span>
            </Link>

            <div className="mb-8">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C5A059]">
                {forgotPassword ? "Reset your password" : isSignup ? "Begin your collection" : "Welcome back"}
              </p>
              <h1 className="font-serif text-3xl font-bold text-[#142D20] sm:text-4xl">
                {forgotPassword ? "ลืมรหัสผ่าน" : isSignup ? "สร้างห้องสมุดของคุณ" : "ยินดีต้อนรับกลับ"}
              </h1>
              <p className="mt-2 text-sm text-[#71877A]">
                {forgotPassword
                  ? "กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่"
                  : isSignup
                    ? "สมัครสมาชิกเพื่อเริ่มสะสมหนังสือที่คุณรัก"
                    : "เข้าสู่ห้องสมุดดิจิทัลของคุณ"}
              </p>
            </div>

            {forgotPassword ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleForgotPassword();
                }}
                className="space-y-4"
              >
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#52685B]">อีเมล</span>
                  <input
                    ref={emailRef}
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-[12px] border border-[#E3ECE5] bg-[#F6FBF5] px-4 py-3 text-sm outline-none transition placeholder:text-[#A0AEA4] focus:border-[#1B3B2B] focus:bg-white focus:ring-2 focus:ring-[#1B3B2B]/10"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading || forgotCooldown > 0}
                  className="w-full rounded-[12px] bg-[#1B3B2B] py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#142D20] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "กำลังส่ง..." : forgotCooldown > 0 ? `ส่งอีกครั้งได้ใน ${forgotCooldown} วินาที` : forgotSentEmail ? "ส่งอีกครั้ง" : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
                </button>
              </form>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                {isSignup && (
                  <>
                    <span className="mb-1.5 block text-xs font-semibold text-[#52685B]">ชื่อที่แสดง</span>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="name"
                      placeholder="ชื่อของคุณ"
                      className="mb-4 w-full rounded-[12px] border border-[#E3ECE5] bg-[#F6FBF5] px-4 py-3 text-sm outline-none transition placeholder:text-[#A0AEA4] focus:border-[#1B3B2B] focus:bg-white focus:ring-2 focus:ring-[#1B3B2B]/10"
                    />
                    {fieldErrors.displayName && <span className="mt-1 block text-xs text-red-600">{fieldErrors.displayName}</span>}
                  </>
                )}
                <span className="mb-1.5 block text-xs font-semibold text-[#52685B]">
                  อีเมล
                </span>
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-[12px] border border-[#E3ECE5] bg-[#F6FBF5] px-4 py-3 text-sm outline-none transition placeholder:text-[#A0AEA4] focus:border-[#1B3B2B] focus:bg-white focus:ring-2 focus:ring-[#1B3B2B]/10"
                />
                {fieldErrors.email && <span className="mt-1 block text-xs text-red-600">{fieldErrors.email}</span>}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#52685B]">
                  รหัสผ่าน
                </span>
                <span className="relative block">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full rounded-[12px] border border-[#E3ECE5] bg-[#F6FBF5] px-4 py-3 pr-11 text-sm outline-none transition placeholder:text-[#A0AEA4] focus:border-[#1B3B2B] focus:bg-white focus:ring-2 focus:ring-[#1B3B2B]/10"
                  />
                  {fieldErrors.password && <span className="mt-1 block text-xs text-red-600">{fieldErrors.password}</span>}
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71877A] hover:text-[#1B3B2B]"
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    <EyeIcon hidden={!showPassword} />
                  </button>
                </span>
              </label>

              {isSignup && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#52685B]">
                    ยืนยันรหัสผ่าน
                  </span>
                  <span className="relative block">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      className="w-full rounded-[12px] border border-[#E3ECE5] bg-[#F6FBF5] px-4 py-3 pr-11 text-sm outline-none transition placeholder:text-[#A0AEA4] focus:border-[#1B3B2B] focus:bg-white focus:ring-2 focus:ring-[#1B3B2B]/10"
                    />
                    {fieldErrors.confirmPassword && <span className="mt-1 block text-xs text-red-600">{fieldErrors.confirmPassword}</span>}
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((visible) => !visible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71877A] hover:text-[#1B3B2B]"
                      aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    >
                      <EyeIcon hidden={!showConfirmPassword} />
                    </button>
                  </span>
                </label>
              )}

              {isSignup && (
                <label className="flex items-start gap-2 text-xs text-[#52685B]">
                  <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1B3B2B]" />
                  <span>
                    ฉันยอมรับ{" "}
                    <Link href="/terms" className="font-semibold text-[#1B3B2B] underline">ข้อกำหนดการใช้งาน</Link>
                    {" "}และ{" "}
                    <Link href="/privacy" className="font-semibold text-[#1B3B2B] underline">นโยบายความเป็นส่วนตัว</Link>
                  </span>
                </label>
              )}

              {!isSignup && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    disabled={loading}
                    className="text-xs font-semibold text-[#71877A] hover:text-[#1B3B2B] disabled:opacity-60"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-[12px] bg-[#1B3B2B] py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#142D20] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "กำลังดำเนินการ..."
                  : isSignup
                    ? "สมัครสมาชิก"
                    : "เข้าสู่ระบบ"}
              </button>
            </form>
            )}

            {message && (
              <p
                className={`mt-4 text-xs ${
                  messageType === "success" ? "text-emerald-700" : "text-red-600"
                }`}
                role="status"
              >
                {message}
              </p>
            )}
            {forgotPassword && forgotSentEmail && messageType === "success" && (
              <p className="mt-2 text-xs text-[#71877A]">ส่งไปที่ {forgotSentEmail}</p>
            )}
            {emailUnconfirmed && (
              <button
                type="button"
                onClick={() => void handleResendConfirmation()}
                disabled={loading || resendCooldown > 0}
                className="mt-2 text-xs font-semibold text-[#1B3B2B] underline disabled:opacity-60"
              >
                {resendCooldown > 0 ? `ส่งอีกครั้งได้ใน ${resendCooldown} วินาที` : "ส่งอีเมลยืนยันอีกครั้ง"}
              </button>
            )}

            {!forgotPassword && <div className="my-7 flex items-center gap-3 text-[10px] text-[#A0AEA4]">
              <span className="h-px flex-1 bg-[#E3ECE5]" />
              <span>หรือ</span>
              <span className="h-px flex-1 bg-[#E3ECE5]" />
            </div>}

            {!forgotPassword && <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-[12px] border border-[#E3ECE5] bg-white py-3 text-sm font-semibold text-[#52685B] transition hover:border-[#1B3B2B] hover:bg-[#F6FBF5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="font-bold text-[#4285F4]">G</span>
              ดำเนินการต่อด้วย Google
            </button>}

            {forgotPassword ? (
              <p className="mt-8 text-center text-xs text-[#71877A]">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-semibold text-[#1B3B2B] hover:text-[#C5A059]"
                >
                  กลับไปเข้าสู่ระบบ
                </button>
              </p>
            ) : <p className="mt-8 text-center text-xs text-[#71877A]">
              {isSignup ? "มีบัญชีอยู่แล้ว? " : "ยังไม่มีบัญชี? "}
              <button
                type="button"
                onClick={() => switchMode(isSignup ? "login" : "signup")}
                className="font-semibold text-[#1B3B2B] hover:text-[#C5A059]"
              >
                {isSignup ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
              </button>
            </p>}

            <p className="mt-8 text-center text-xs text-[#71877A]">
              กลับไปที่{" "}
              <Link href="/" className="font-semibold text-[#1B3B2B] hover:text-[#C5A059]">
                หน้าร้าน Folio &amp; Co.
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

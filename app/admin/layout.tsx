import { ReactNode, Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import AdminNavTabs from "@/components/AdminNavTabs";

async function AdminShell({ children }: { children: ReactNode }) {
  // ตรวจสอบสิทธิ์แอดมินฝั่งเซิร์ฟเวอร์ ถ้าไม่ใช่จะ redirect ไปหน้าแรกทันที
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-[#F6FBF5] text-[#1A2E22]">
      {/* Admin Top Header */}
      <header className="border-b border-[#e3ece5] bg-[#1b3b2b] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded bg-[#C5A059] font-serif text-base font-bold text-[#142d20]"
            >
              F
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-base font-bold tracking-tight text-white">
                  Folio &amp; Co.
                </span>
                <span className="rounded bg-[#C5A059] px-1.5 py-0.5 text-[10px] font-bold text-[#142d20]">
                  ADMIN
                </span>
              </div>
              <p className="text-[10px] text-[#a3b8ac]">
                ระบบจัดการร้านค้าหลังบ้าน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="hidden text-[11px] text-[#c6d8cc] sm:inline">
              ผู้ดูแล: <strong className="text-white">{user.email}</strong>
            </span>
            <Link
              href="/"
              className="rounded-lg border border-[#3b5d49] bg-[#224433] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2c533f]"
            >
              ← กลับไปหน้าร้าน
            </Link>
          </div>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="border-b border-[#e3ece5] bg-white">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <AdminNavTabs />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6FBF5] flex items-center justify-center p-6 text-xs text-[#71877a]">
          กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...
        </div>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

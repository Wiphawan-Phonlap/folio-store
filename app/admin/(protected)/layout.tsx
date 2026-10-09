import { ReactNode, Suspense } from "react";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import AdminSidebar from "@/components/AdminSidebar";

async function AdminShell({ children }: { children: ReactNode }) {
  await connection();
  // ตรวจสอบสิทธิ์แอดมินฝั่งเซิร์ฟเวอร์ ถ้าไม่ใช่จะ redirect ไปหน้าแรกทันที
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-[#F6FBF5] text-[#1A2E22]">
      <AdminSidebar email={user.email} />
      <main className="min-w-0 flex-1 px-4 py-8 pt-20 md:px-8 md:pt-8">{children}</main>
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

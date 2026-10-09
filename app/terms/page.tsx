import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F6FBF5] px-4 py-12 text-[#142D20]">
      <article className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <Link href="/login" className="text-sm text-[#1B3B2B]">← กลับเข้าสู่ระบบ</Link>
        <h1 className="mt-6 font-serif text-3xl font-bold">ข้อกำหนดการใช้งาน</h1>
        <p className="mt-4 text-sm leading-7 text-[#52685B]">หน้านี้เป็นข้อความชั่วคราวสำหรับการทดสอบระบบ กรุณาแทนที่ด้วยข้อกำหนดการใช้งานฉบับจริงก่อนเปิดให้บริการ</p>
      </article>
    </main>
  );
}

import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Header from "@/components/Header";
import CheckoutSuccessActions from "@/components/CheckoutSuccessActions";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";

type SearchParams = Promise<{ order_id?: string; session_id?: string }>;
type OrderItem = { id: number; title: string; price: number; qty: number };
type Order = {
  id: number;
  user_id: string;
  total: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
};

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[#e3ece5] bg-white px-6 py-12 text-center shadow-sm">
      <div className="mb-3 text-4xl">!</div>
      <h1 className="font-serif text-xl font-bold text-[#142d20]">ไม่สามารถยืนยันการชำระเงินได้</h1>
      <p className="mt-2 text-sm text-[#71877a]">{message}</p>
      <Link href="/orders" className="mt-6 inline-block rounded-lg bg-[#1b3b2b] px-5 py-2.5 text-xs font-semibold text-white">
        ดูประวัติการสั่งซื้อ
      </Link>
    </div>
  );
}

async function CheckoutSuccessContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const orderId = Number(params.order_id);
  const sessionId = params.session_id?.trim() ?? "";
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  let order: Order | null = null;
  let confirmed = false;
  let errorMessage = "";

  if (!sessionId || !sessionId.startsWith("cs_") || !Number.isInteger(orderId) || orderId <= 0) {
    errorMessage = "ข้อมูลการชำระเงินไม่ครบถ้วน กรุณาตรวจสอบจากประวัติการสั่งซื้อ";
  } else {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      const metadataOrderId = session.metadata?.order_id;
      const metadataUserId = session.metadata?.user_id;
      if (metadataOrderId !== String(orderId) || metadataUserId !== userData.user.id) {
        errorMessage = "ข้อมูลคำสั่งซื้อไม่ตรงกับบัญชีผู้ใช้";
      } else if (session.payment_status !== "paid") {
        errorMessage = "การชำระเงินยังไม่เสร็จสมบูรณ์";
      } else {
        const admin = createAdminClient();
        const { data: currentOrder, error: orderError } = await admin
          .from("orders")
          .select("id, user_id, total, status, created_at, order_items(id, title, price, qty)")
          .eq("id", orderId)
          .maybeSingle();

        if (orderError || !currentOrder || currentOrder.user_id !== userData.user.id) {
          errorMessage = "ไม่พบคำสั่งซื้อหรือคุณไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้";
        } else {
          let finalStatus = currentOrder.status;
          if (currentOrder.status === "pending") {
            const { error: updateError } = await admin
              .from("orders")
              .update({ status: "paid" })
              .eq("id", orderId)
              .eq("user_id", userData.user.id)
              .eq("status", "pending");
            if (updateError) {
              console.error("[checkout-success] Failed to update order", updateError);
            } else {
              finalStatus = "paid";
            }
          }
          confirmed = finalStatus === "paid";
          order = { ...currentOrder, status: finalStatus } as Order;
        }
      }
    } catch (error: unknown) {
      console.error("[checkout-success] Failed to verify Stripe session", error);
      errorMessage = "เกิดข้อผิดพลาดระหว่างตรวจสอบการชำระเงิน กรุณาลองใหม่อีกครั้ง";
    }
  }

  return (
    <div className="min-h-screen bg-[#F6FBF5] text-[#1A2E22]">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10 md:px-8">
        {errorMessage || !order ? (
          <ErrorState message={errorMessage || "กำลังรอข้อมูลคำสั่งซื้อ"} />
        ) : (
          <section className="rounded-2xl border border-[#e3ece5] bg-white px-5 py-10 text-center shadow-sm">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl ${confirmed ? "bg-emerald-100 text-emerald-700" : "bg-[#fffaf0] text-[#806b2d]"}`}>
              {confirmed ? "✓" : "…"}
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#1b3b2b]">
              {confirmed ? "ชำระเงินสำเร็จ" : "กำลังยืนยันการชำระเงิน"}
            </h1>
            <p className="mt-2 text-sm text-[#71877a]">
              {confirmed ? "ขอบคุณสำหรับคำสั่งซื้อของคุณ" : "ระบบกำลังตรวจสอบข้อมูลจาก Stripe"}
            </p>
            <div className="mt-6 border-y border-[#e3ece5] py-4 text-left text-sm">
              <p><span className="text-[#71877a]">เลขคำสั่งซื้อ:</span> #{order.id}</p>
              <p className="mt-1"><span className="text-[#71877a]">วันที่:</span> {new Date(order.created_at).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</p>
              <p className="mt-1"><span className="text-[#71877a]">ยอดรวม:</span> ฿{Number(order.total).toLocaleString()}</p>
            </div>
            <ul className="mt-5 space-y-2 text-left text-sm">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>{item.title} <span className="text-[#71877a]">× {item.qty}</span></span>
                  <span className="font-semibold text-[#1b3b2b]">฿{(item.price * item.qty).toLocaleString()}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <CheckoutSuccessActions orderId={order.id} sessionId={sessionId} confirmed={confirmed} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function CheckoutSuccessPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F6FBF5] p-10 text-center text-sm text-[#71877a]">กำลังตรวจสอบการชำระเงิน...</main>}>
      <CheckoutSuccessContent searchParams={searchParams} />
    </Suspense>
  );
}

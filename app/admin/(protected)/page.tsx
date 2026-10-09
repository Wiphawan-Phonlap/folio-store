import { connection } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase-admin";

type OrderItem = {
  title: string;
  qty: number;
  price: number;
};

type OrderRow = {
  total: number;
  status: string;
  created_at: string;
  order_items: OrderItem[] | null;
};

const bangkokDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const bangkokLabelFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
});

function bangkokDateKey(date: Date) {
  return bangkokDateFormatter.format(date);
}

function getRecentDateKeys() {
  const todayKey = bangkokDateKey(new Date());
  const [year, month, day] = todayKey.split("-").map(Number);

  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, day - (13 - index), 12));
    return {
      key: bangkokDateKey(date),
      label: bangkokLabelFormatter.format(date),
    };
  });
}

export default async function AdminPage() {
  await connection();
  await requireAdmin();

  const admin = createAdminClient();
  const [{ data: orders, error: ordersError }, { count: publishedCount, error: productsError }] =
    await Promise.all([
      admin
        .from("orders")
        .select("total, status, created_at, order_items(title, qty, price)")
        .order("created_at", { ascending: false }),
      admin
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true),
    ]);

  if (ordersError) throw new Error(`โหลดข้อมูลคำสั่งซื้อไม่สำเร็จ: ${ordersError.message}`);
  if (productsError) throw new Error(`โหลดจำนวนหนังสือไม่สำเร็จ: ${productsError.message}`);

  const rows = (orders ?? []) as OrderRow[];
  const paidOrders = rows.filter((order) => order.status === "paid");
  const recentDates = getRecentDateKeys();
  const nowBangkok = bangkokDateKey(new Date());
  const currentMonth = nowBangkok.slice(0, 7);

  const revenueFor = (predicate: (order: OrderRow) => boolean) =>
    paidOrders
      .filter(predicate)
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

  const dailySales = recentDates.map((date) => ({
    ...date,
    value: revenueFor((order) => bangkokDateKey(new Date(order.created_at)) === date.key),
  }));
  const maxDailySales = Math.max(...dailySales.map((day) => day.value), 1);

  const topBookMap = new Map<string, { quantity: number; revenue: number }>();
  for (const order of paidOrders) {
    for (const item of order.order_items ?? []) {
      const current = topBookMap.get(item.title) ?? { quantity: 0, revenue: 0 };
      current.quantity += Number(item.qty || 0);
      current.revenue += Number(item.qty || 0) * Number(item.price || 0);
      topBookMap.set(item.title, current);
    }
  }
  const topBooks = [...topBookMap.entries()]
    .sort(([, first], [, second]) => second.quantity - first.quantity)
    .slice(0, 5);

  const cards = [
    { label: "ยอดขายวันนี้", value: revenueFor((order) => bangkokDateKey(new Date(order.created_at)) === nowBangkok), money: true },
    { label: "ยอดขายเดือนนี้", value: revenueFor((order) => bangkokDateKey(new Date(order.created_at)).startsWith(currentMonth)), money: true },
    { label: "ออเดอร์รอชำระ", value: rows.filter((order) => order.status === "pending").length, money: false },
    { label: "ออเดอร์ชำระแล้ว", value: paidOrders.length, money: false },
    { label: "หนังสือที่เผยแพร่", value: publishedCount ?? 0, money: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#142d20] md:text-3xl">แดชบอร์ด</h1>
        <p className="mt-1 text-xs text-[#71877a]">ภาพรวมร้านค้าและยอดขายที่ชำระแล้ว</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-[#e3ece5] bg-white p-4 shadow-sm">
            <p className="text-[11px] text-[#71877a]">{card.label}</p>
            <p className="mt-1 font-serif text-2xl font-bold text-[#1b3b2b]">
              {card.money ? `฿${card.value.toLocaleString("th-TH")}` : card.value.toLocaleString("th-TH")}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#e3ece5] bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-bold text-[#142d20]">ยอดขายรายวัน 14 วันล่าสุด</h2>
          <div className="mt-5 flex h-56 items-end gap-1 border-b border-[#e3ece5] px-1">
            {dailySales.map((day) => (
              <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[9px] text-[#71877a]">
                  {day.value > 0 ? `฿${day.value.toLocaleString("th-TH")}` : "0"}
                </span>
                <div
                  className="w-full max-w-8 rounded-t bg-[#C5A059] transition"
                  style={{ height: `${Math.max((day.value / maxDailySales) * 155, 4)}px` }}
                  title={`${day.label}: ฿${day.value.toLocaleString("th-TH")}`}
                />
                <span className="whitespace-nowrap text-[9px] text-[#71877a]">{day.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e3ece5] bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-bold text-[#142d20]">หนังสือขายดี 5 อันดับ</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#e3ece5] text-[#71877a]">
                <tr><th className="pb-2">หนังสือ</th><th className="pb-2 text-right">จำนวนเล่ม</th><th className="pb-2 text-right">ยอดรวม</th></tr>
              </thead>
              <tbody className="divide-y divide-[#e3ece5]">
                {topBooks.map(([title, book], index) => (
                  <tr key={title}>
                    <td className="py-3 pr-2 text-[#142d20]"><span className="mr-2 font-bold text-[#C5A059]">{index + 1}</span>{title}</td>
                    <td className="py-3 text-right text-[#1b3b2b]">{book.quantity.toLocaleString("th-TH")}</td>
                    <td className="py-3 text-right font-semibold text-[#1b3b2b]">฿{book.revenue.toLocaleString("th-TH")}</td>
                  </tr>
                ))}
                {topBooks.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-[#71877a]">ยังไม่มีข้อมูลการขาย</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

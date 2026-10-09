"use client";

import { useEffect, useState, useCallback } from "react";

type OrderItem = {
  id: number;
  product_id: number;
  title: string;
  price: number;
  qty: number;
};

type Order = {
  id: number;
  user_id: string;
  user_email: string;
  total: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  created_at: string;
  stripe_session_id?: string | null;
  order_items: OrderItem[];
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      const res = await fetch(`/api/admin/orders?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "โหลดรายการคำสั่งซื้อไม่สำเร็จ");
      }
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลด";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, page, searchTerm]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  const filteredOrders = orders;

  async function changeStatus(status: "pending" | "paid" | "cancelled") {
    if (!selectedOrder || !window.confirm(`ยืนยันเปลี่ยนสถานะคำสั่งซื้อ #${selectedOrder.id} เป็น ${status} หรือไม่?`)) return;
    const response = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "เปลี่ยนสถานะไม่สำเร็จ");
      return;
    }
    setSelectedOrder(null);
    await loadOrders();
  }

  const totalRevenue = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const paidOrdersCount = orders.filter((o) => o.status === "paid").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#142d20] md:text-3xl">
            คำสั่งซื้อทั้งหมด
          </h1>
          <p className="mt-1 text-xs text-[#71877a]">
            ประวัติการสั่งซื้อ รายละเอียดหนังสือ และสถานะการชำระเงิน เรียงจากใหม่สุดไปเก่าสุด
          </p>
        </div>

        <button
          onClick={loadOrders}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#dce6de] bg-white px-3.5 py-2 text-xs font-semibold text-[#1b3b2b] shadow-xs hover:bg-[#f0f5f0] w-full sm:w-auto"
        >
          <span>🔄</span>
          <span>{loading ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e3ece5] bg-white p-4 shadow-xs">
          <span className="text-[11px] font-medium text-[#71877a]">
            คำสั่งซื้อทั้งหมด
          </span>
          <div className="mt-1 font-serif text-2xl font-bold text-[#142d20]">
            {orders.length}
          </div>
          <span className="text-[10px] text-[#52685b]">รายการในระบบ</span>
        </div>

        <div className="rounded-2xl border border-[#e3ece5] bg-white p-4 shadow-xs">
          <span className="text-[11px] font-medium text-[#71877a]">
            ชำระเงินแล้ว
          </span>
          <div className="mt-1 font-serif text-2xl font-bold text-emerald-700">
            {paidOrdersCount}
          </div>
          <span className="text-[10px] text-emerald-600">รายการสำเร็จ</span>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-[#C5A059]/40 bg-gradient-to-r from-[#1b3b2b] to-[#142d20] p-4 text-white shadow-xs">
          <span className="text-[11px] font-medium text-[#C5A059]">
            ยอดขายรวม (ที่ชำระแล้ว)
          </span>
          <div className="mt-1 font-serif text-2xl font-bold text-white">
            ฿{totalRevenue.toLocaleString()}
          </div>
          <span className="text-[10px] text-[#a3b8ac]">THB รวมทั้งสิ้น</span>
        </div>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#e3ece5] bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          placeholder="ค้นหาด้วยหมายเลขคำสั่งซื้อ, อีเมลลูกค้า หรือชื่อหนังสือ..."
          className="w-full rounded-lg border border-[#dce6de] bg-[#f0f5f0] px-3.5 py-2 text-xs outline-none focus:border-[#1b3b2b] focus:bg-white sm:max-w-xs"
        />

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setFilterStatus("all")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              filterStatus === "all"
                ? "bg-[#1b3b2b] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ทั้งหมด ({orders.length})
          </button>
          <button
            onClick={() => setFilterStatus("paid")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              filterStatus === "paid"
                ? "bg-emerald-700 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            ชำระเงินแล้ว ({paidOrdersCount})
          </button>
          <button onClick={() => { setFilterStatus("failed"); setPage(1); }} className={`rounded-full px-3 py-1 font-medium ${filterStatus === "failed" ? "bg-red-700 text-white" : "bg-red-50 text-red-700"}`}>ไม่สำเร็จ</button>
          <button onClick={() => { setFilterStatus("cancelled"); setPage(1); }} className={`rounded-full px-3 py-1 font-medium ${filterStatus === "cancelled" ? "bg-slate-700 text-white" : "bg-slate-50 text-slate-700"}`}>ยกเลิกแล้ว</button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              filterStatus === "pending"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            รอชำระเงิน ({orders.filter((o) => o.status === "pending").length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="rounded-2xl border border-[#e3ece5] bg-white p-12 text-center text-xs text-[#71877a]">
          กำลังโหลดประวัติคำสั่งซื้อ...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-[#e3ece5] bg-white p-12 text-center shadow-xs">
          <p className="font-serif text-base font-bold text-[#142d20]">
            ไม่พบคำสั่งซื้อ
          </p>
          <p className="mt-1 text-xs text-[#71877a]">
            {searchTerm || filterStatus !== "all"
              ? "ลองเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรองสถานะ"
              : "ยังไม่มีคำสั่งซื้อในระบบ"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              role="button"
              tabIndex={0}
              className="rounded-2xl border border-[#e3ece5] bg-white p-4 shadow-xs sm:p-5"
            >
              {/* Order Header */}
              <div className="flex flex-col gap-2 border-b border-[#e3ece5] pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-[#142d20]">
                    คำสั่งซื้อ #{order.id}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      order.status === "paid"
                        ? "bg-emerald-100 text-emerald-800"
                      : order.status === "failed" || order.status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {order.status === "paid" ? "✓ ชำระเงินแล้ว" : order.status === "cancelled" ? "ยกเลิกแล้ว" : order.status === "failed" ? "ไม่สำเร็จ" : "⏳ รอชำระเงิน"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#71877a]">
                  <span>
                    📅{" "}
                    {new Date(order.created_at).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="truncate max-w-[200px] sm:max-w-none text-[#1b3b2b] font-medium">
                    ✉️ {order.user_email}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              <div className="py-3">
                <span className="text-[10px] font-semibold text-[#71877a] uppercase tracking-wider block mb-2">
                  รายการหนังสือที่สั่งซื้อ ({order.order_items?.length || 0} เล่ม)
                </span>
                <ul className="space-y-1.5">
                  {order.order_items?.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between text-xs text-[#142d20]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-gray-400 text-[10px]">#{item.product_id}</span>
                        <span className="truncate font-medium">{item.title}</span>
                        <span className="text-[#71877a] shrink-0">
                          × {item.qty}
                        </span>
                      </div>
                      <span className="shrink-0 font-semibold text-[#1b3b2b]">
                        ฿{(item.price * item.qty).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Order Footer */}
              <div className="flex items-center justify-between border-t border-[#e3ece5] pt-3 text-xs">
                <span className="text-[#71877a]">ยอดรวมสุทธิ</span>
                <span className="font-serif text-lg font-bold text-[#142d20]">
                  ฿{order.total.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-[#71877a]">
        <span>หน้า {page} / {Math.max(1, Math.ceil(total / 20))}</span>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1 disabled:opacity-40">ก่อนหน้า</button>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1 disabled:opacity-40">ถัดไป</button>
        </div>
      </div>
      {selectedOrder && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#142D20]/40 p-4" onClick={() => setSelectedOrder(null)}>
        <div className="w-full max-w-lg rounded-2xl bg-white p-6" onClick={(event) => event.stopPropagation()}>
          <div className="flex justify-between"><h2 className="font-serif text-xl font-bold">คำสั่งซื้อ #{selectedOrder.id}</h2><button onClick={() => setSelectedOrder(null)}>ปิด</button></div>
          <p className="mt-3 text-xs text-[#71877a]">ผู้ซื้อ: {selectedOrder.user_email}</p>
          <p className="text-xs text-[#71877a]">วันที่: {new Date(selectedOrder.created_at).toLocaleString("th-TH")}</p>
          <p className="text-xs text-[#71877a]">สถานะ: {selectedOrder.status}</p>
          <ul className="my-4 space-y-2 text-sm">{selectedOrder.order_items.map((item) => <li key={item.id} className="flex justify-between"><span>{item.title} × {item.qty}</span><span>฿{(item.price * item.qty).toLocaleString()}</span></li>)}</ul>
          <p className="text-xs text-[#71877a]">Stripe session: {selectedOrder.stripe_session_id ? `${selectedOrder.stripe_session_id.slice(0, 18)}...` : "ไม่มีข้อมูล"}</p>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#e3ece5] pt-4">
            <button onClick={() => void changeStatus("pending")} className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">ตั้งเป็นรอชำระ</button>
            <button onClick={() => void changeStatus("paid")} className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800">ตั้งเป็นชำระแล้ว</button>
            <button onClick={() => void changeStatus("cancelled")} className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">ยกเลิกคำสั่งซื้อ</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

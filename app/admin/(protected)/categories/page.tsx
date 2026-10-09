"use client";

import { useEffect, useState } from "react";

type Category = { id: number; name: string };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/categories", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) setError(data.error || "โหลดหมวดหมู่ไม่สำเร็จ");
    else setCategories(data.categories || []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("กรุณาระบุชื่อหมวดหมู่");
      return;
    }
    const response = await fetch("/api/admin/categories", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, name: trimmed } : { name: trimmed }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "บันทึกหมวดหมู่ไม่สำเร็จ");
      return;
    }
    setName("");
    setEditingId(null);
    setError("");
    await load();
  }

  async function remove(id: number) {
    if (!window.confirm("ต้องการลบหมวดหมู่นี้หรือไม่? หนังสือในหมวดนี้จะกลายเป็นไม่มีหมวด")) return;
    const response = await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) setError(data.error || "ลบหมวดหมู่ไม่สำเร็จ");
    else await load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#142D20] md:text-3xl">จัดการหมวดหมู่</h1>
        <p className="mt-1 text-xs text-[#71877A]">เพิ่ม แก้ไข และจัดระเบียบหมวดหมู่หนังสือ</p>
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">{error}</p>}
      <div className="flex flex-col gap-2 rounded-[12px] border border-[#E3ECE5] bg-white p-4 shadow-sm sm:flex-row">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อหมวดหมู่" className="flex-1 rounded-lg border border-[#DCE6DE] bg-[#F0F5F0] px-3 py-2 text-sm outline-none focus:border-[#1B3B2B]" />
        <button onClick={save} className="rounded-lg bg-[#1B3B2B] px-5 py-2 text-xs font-semibold text-white">{editingId ? "บันทึกการแก้ไข" : "+ เพิ่มหมวดหมู่"}</button>
        {editingId && <button onClick={() => { setEditingId(null); setName(""); }} className="rounded-lg border border-[#DCE6DE] px-4 py-2 text-xs">ยกเลิก</button>}
      </div>
      <div className="overflow-hidden rounded-[12px] border border-[#E3ECE5] bg-white shadow-sm">
        {loading ? <p className="p-8 text-center text-xs text-[#71877A]">กำลังโหลด...</p> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F4F8F5] text-xs text-[#52685B]"><tr><th className="px-4 py-3">ชื่อหมวดหมู่</th><th className="px-4 py-3 text-right">จัดการ</th></tr></thead>
            <tbody className="divide-y divide-[#E3ECE5]">
              {categories.map((category) => <tr key={category.id}><td className="px-4 py-3 text-[#142D20]">{category.name}</td><td className="space-x-3 px-4 py-3 text-right text-xs"><button onClick={() => { setEditingId(category.id); setName(category.name); }} className="font-semibold text-[#1B3B2B]">แก้ไข</button><button onClick={() => void remove(category.id)} className="font-semibold text-red-600">ลบ</button></td></tr>)}
              {categories.length === 0 && <tr><td colSpan={2} className="p-8 text-center text-xs text-[#71877A]">ยังไม่มีหมวดหมู่</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

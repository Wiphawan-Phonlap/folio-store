"use client";

import { useState } from "react";
import { Product } from "@/components/BookCard";
import { Category } from "@/components/CategoryChips";

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
  categories: Category[];
};

export default function ProductModal({
  isOpen,
  onClose,
  onSuccess,
  product,
  categories,
}: ProductModalProps) {
  const isEditing = !!product;

  const [title, setTitle] = useState(product?.title || "");
  const [author, setAuthor] = useState(product?.author || "");
  const [price, setPrice] = useState(product?.price?.toString() || "");
  const [subtitle, setSubtitle] = useState(product?.subtitle || "");
  const [description, setDescription] = useState(product?.description || "");
  const [categoryId, setCategoryId] = useState(
    product?.category_id?.toString() || ""
  );
  const [isFeatured, setIsFeatured] = useState(!!product?.is_featured);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("กรุณากรอกชื่อหนังสือ");
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError("ราคาต้องเป็นตัวเลขที่ไม่ติดลบ");
      return;
    }

    setLoading(true);

    const payload = {
      title: title.trim(),
      author: author.trim(),
      price: numPrice,
      subtitle: subtitle.trim() || null,
      description: description.trim() || null,
      category_id: categoryId ? Number(categoryId) : null,
      is_featured: isFeatured,
    };

    try {
      const url = isEditing
        ? `/api/admin/products/${product.id}`
        : "/api/admin/products";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "การเชื่อมต่อล้มเหลว";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e3ece5] bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-[#e3ece5] pb-3">
          <h2 className="font-serif text-lg font-bold text-[#142d20]">
            {isEditing ? "✏️ แก้ไขข้อมูลหนังสือ" : "➕ เพิ่มหนังสือใหม่"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="mb-1 block font-semibold text-[#142d20]">
              ชื่อหนังสือ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ระบุชื่อหนังสือ"
              className="w-full rounded-lg border border-[#dce6de] bg-[#f0f5f0] px-3.5 py-2.5 text-xs text-[#142d20] outline-none focus:border-[#1b3b2b] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-semibold text-[#142d20]">
                ผู้แต่ง
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="ชื่อผู้แต่ง"
                className="w-full rounded-lg border border-[#dce6de] bg-[#f0f5f0] px-3.5 py-2.5 text-xs text-[#142d20] outline-none focus:border-[#1b3b2b] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-[#142d20]">
                ราคา (บาท) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="เช่น 350"
                className="w-full rounded-lg border border-[#dce6de] bg-[#f0f5f0] px-3.5 py-2.5 text-xs text-[#142d20] outline-none focus:border-[#1b3b2b] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-[#142d20]">
              หมวดหมู่
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-[#dce6de] bg-[#f0f5f0] px-3.5 py-2.5 text-xs text-[#142d20] outline-none focus:border-[#1b3b2b] focus:bg-white"
            >
              <option value="">-- ไม่ระบุหมวดหมู่ --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-[#142d20]">
              คำโปรย / ชื่อรอง (Subtitle)
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="เช่น วรรณกรรมชิ้นเอกแห่งยุคศตวรรษที่ 20"
              className="w-full rounded-lg border border-[#dce6de] bg-[#f0f5f0] px-3.5 py-2.5 text-xs text-[#142d20] outline-none focus:border-[#1b3b2b] focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-[#142d20]">
              คำอธิบายรายละเอียดหนังสือ (Description)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เนื้อหาย่อ จุดเด่นของหนังสือ..."
              className="w-full rounded-lg border border-[#dce6de] bg-[#f0f5f0] px-3.5 py-2.5 text-xs text-[#142d20] outline-none focus:border-[#1b3b2b] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_featured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#1b3b2b] focus:ring-[#1b3b2b]"
            />
            <label
              htmlFor="is_featured"
              className="cursor-pointer font-medium text-[#142d20]"
            >
              ✦ แนะนำเป็นวรรณกรรมคัดสรรเด่นประจำเดือน (Featured Book)
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-[#e3ece5] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-[#dce6de] px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#1b3b2b] px-5 py-2 font-semibold text-white shadow hover:bg-[#142d20] disabled:opacity-60"
            >
              {loading ? "กำลังบันทึก..." : isEditing ? "บันทึกการแก้ไข" : "เพิ่มหนังสือ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

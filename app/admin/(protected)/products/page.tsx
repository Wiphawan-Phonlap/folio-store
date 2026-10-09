"use client";

import { useEffect, useState, useCallback } from "react";
import { Product } from "@/components/BookCard";
import { Category } from "@/components/CategoryChips";
import ProductModal from "@/components/admin/ProductModal";
import UploadPdfModal from "@/components/admin/UploadPdfModal";

type ProductWithFile = Product & {
  has_file: boolean;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductWithFile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTargetProduct, setUploadTargetProduct] =
    useState<Product | null>(null);

  // Delete with orders warning modal state
  const [deleteWarning, setDeleteWarning] = useState<{
    product: ProductWithFile;
    orderCount: number;
    message: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/products", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "โหลดรายการหนังสือไม่สำเร็จ");
      }
      setProducts(data.products || []);
      setCategories(data.categories || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลด";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function togglePublished(product: ProductWithFile) {
    const response = await fetch(`/api/admin/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...product, is_published: product.is_published === false }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || "เปลี่ยนสถานะการเผยแพร่ไม่สำเร็จ");
    else await loadData();
  }

  async function handleDelete(product: ProductWithFile) {
    setError("");
    setDeletingId(product.id);

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (res.status === 409 && data.hasOrders) {
        // มีออเดอร์ แสดงกล่องแจ้งเตือนแอดมินก่อนลบ
        setDeleteWarning({
          product,
          orderCount: data.orderCount,
          message: data.warning,
        });
        setDeletingId(null);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "ลบหนังสือไม่สำเร็จ");
      }

      setDeleteWarning(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบ";
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const filteredProducts = products.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.author?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#142d20] md:text-3xl">
            จัดการหนังสือ
          </h1>
          <p className="mt-1 text-xs text-[#71877a]">
            เพิ่ม แก้ไข ลบ และอัปโหลดไฟล์ดิจิทัล (PDF) ของหนังสือทั้งหมดในระบบ ({products.length} รายการ)
          </p>
        </div>

        <button
          onClick={() => {
            setEditingProduct(null);
            setIsProductModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1b3b2b] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#142d20] w-full sm:w-auto"
        >
          <span>➕</span>
          <span>เพิ่มหนังสือใหม่</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e3ece5] bg-white p-3 shadow-xs">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="ค้นหาชื่อหนังสือ หรือผู้แต่งในระบบแอดมิน..."
          className="w-full rounded-lg border border-[#dce6de] bg-[#f0f5f0] px-3.5 py-2 text-xs outline-none focus:border-[#1b3b2b] focus:bg-white"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
          >
            ล้างคำค้น
          </button>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="rounded-2xl border border-[#e3ece5] bg-white p-12 text-center text-xs text-[#71877a]">
          กำลังโหลดข้อมูลหนังสือ...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-[#e3ece5] bg-white p-12 text-center shadow-xs">
          <p className="font-serif text-base font-bold text-[#142d20]">
            {searchTerm ? "ไม่พบหนังสือที่ตรงกับคำค้นหา" : "ยังไม่มีรายการหนังสือในระบบ"}
          </p>
          <p className="mt-1 text-xs text-[#71877a]">
            {searchTerm
              ? "ลองค้นหาด้วยคำอื่น หรือกดล้างคำค้น"
              : "กดปุ่ม 'เพิ่มหนังสือใหม่' ด้านบนเพื่อเริ่มต้น"}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-[#e3ece5] bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#e3ece5] bg-[#f4f8f5] text-[#52685b]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">ชื่อเรื่อง / ผู้แต่ง</th>
                    <th className="px-4 py-3 font-semibold">หมวดหมู่</th>
                    <th className="px-4 py-3 font-semibold text-right">ราคา</th>
                    <th className="px-4 py-3 font-semibold text-center">สถานะไฟล์ PDF</th>
                    <th className="px-4 py-3 font-semibold text-center">เผยแพร่</th>
                    <th className="px-4 py-3 font-semibold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3ece5]">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-[#fcfdfc]">
                      <td className="px-4 py-3 text-gray-400 font-mono">
                        #{product.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#142d20]">
                            {product.title}
                          </span>
                          {product.is_featured && (
                            <span className="rounded bg-[#C5A059]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#8a6e30]">
                              ✦ เด่น
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#71877a]">
                          {product.author || "ไม่ระบุผู้แต่ง"}
                          {product.subtitle && ` • ${product.subtitle}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#52685b]">
                        {product.category_id
                          ? categoryMap.get(product.category_id) || `หมวด #${product.category_id}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1b3b2b]">
                        ฿{product.price.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {product.has_file ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            ✓ มีไฟล์แล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                            ⚠️ ยังไม่มีไฟล์
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => void togglePublished(product)} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${product.is_published === false ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"}`}>
                          {product.is_published === false ? "ซ่อนอยู่" : "เผยแพร่"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setUploadTargetProduct(product);
                              setIsUploadModalOpen(true);
                            }}
                            className="rounded border border-[#dce6de] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1b3b2b] hover:bg-[#f0f5f0]"
                            title="อัปโหลดไฟล์ PDF เข้า Storage"
                          >
                            📤 อัปโหลด PDF
                          </button>
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setIsProductModalOpen(true);
                            }}
                            className="rounded border border-[#dce6de] bg-white px-2.5 py-1 text-[11px] font-medium text-[#52685b] hover:bg-[#f0f5f0]"
                          >
                            ✏️ แก้ไข
                          </button>
                          <button
                            onClick={() => void handleDelete(product)}
                            disabled={deletingId === product.id}
                            className="rounded border border-red-200 bg-white px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === product.id ? "กำลังลบ..." : "🗑️ ลบ"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (Optimized for 390px and small screens) */}
          <div className="space-y-3 md:hidden">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="rounded-2xl border border-[#e3ece5] bg-white p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-gray-400">
                        #{product.id}
                      </span>
                      {product.is_featured && (
                        <span className="rounded bg-[#C5A059]/20 px-1 py-0.2 text-[9px] font-bold text-[#8a6e30]">
                          ✦ เด่น
                        </span>
                      )}
                    </div>
                    <h3 className="truncate font-bold text-sm text-[#142d20]">
                      {product.title}
                    </h3>
                    <p className="text-xs text-[#71877a]">
                      {product.author || "ไม่ระบุผู้แต่ง"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-sm text-[#1b3b2b]">
                      ฿{product.price.toLocaleString()}
                    </span>
                    <div className="text-[10px] text-[#52685b]">
                      {product.category_id
                        ? categoryMap.get(product.category_id) || `หมวด #${product.category_id}`
                        : "-"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#e3ece5] pt-2 text-xs">
                  <div>
                    {product.has_file ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        ✓ มีไฟล์แล้ว
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                        ⚠️ ยังไม่มีไฟล์
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-[#e3ece5] pt-2">
                  <button
                    onClick={() => {
                      setUploadTargetProduct(product);
                      setIsUploadModalOpen(true);
                    }}
                    className="rounded-lg border border-[#dce6de] bg-white py-1.5 text-center text-[10px] font-medium text-[#1b3b2b] hover:bg-[#f0f5f0]"
                  >
                    📤 PDF
                  </button>
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setIsProductModalOpen(true);
                    }}
                    className="rounded-lg border border-[#dce6de] bg-white py-1.5 text-center text-[10px] font-medium text-[#52685b] hover:bg-[#f0f5f0]"
                  >
                    ✏️ แก้ไข
                  </button>
                  <button
                    onClick={() => void handleDelete(product)}
                    disabled={deletingId === product.id}
                    className="rounded-lg border border-red-200 bg-white py-1.5 text-center text-[10px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    🗑️ ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Product Add/Edit Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSuccess={loadData}
        product={editingProduct}
        categories={categories}
      />

      {/* Upload PDF Modal */}
      <UploadPdfModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={loadData}
        product={uploadTargetProduct}
      />

      {/* Warning Modal when Deleting Product with Orders */}
      {deleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-serif text-base font-bold text-[#142d20]">
                เตือน: หนังสือมีคำสั่งซื้อแล้ว
              </h3>
            </div>

            <p className="text-xs text-[#52685b] leading-relaxed">
              หนังสือเรื่อง <strong>&ldquo;{deleteWarning.product.title}&rdquo;</strong>{" "}
              มีประวัติการสั่งซื้อในระบบแล้วจำนวน{" "}
              <strong className="text-[#142d20]">{deleteWarning.orderCount}</strong>{" "}
              รายการ
            </p>

            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
              📌 หนังสือที่มีประวัติการสั่งซื้อไม่สามารถลบได้ เพื่อรักษาประวัติและสิทธิ์ดาวน์โหลด
              กรุณาใช้สวิตช์ “ซ่อนอยู่” แทน
            </div>

            <div className="flex justify-end gap-2 border-t border-[#e3ece5] pt-3 text-xs">
              <button
                onClick={() => setDeleteWarning(null)}
                className="rounded-lg border border-[#dce6de] px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

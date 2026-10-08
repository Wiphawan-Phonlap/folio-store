"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type Category = {
  id: number;
  name: string;
};

function CategoryChipsContent({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategoryId = searchParams.get("category");

  function handleSelectCategory(categoryId?: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId !== undefined) {
      params.set("category", String(categoryId));
    } else {
      params.delete("category");
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  const isAllActive = !activeCategoryId;

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs no-scrollbar">
      <span className="mr-2 shrink-0 text-[11px] font-semibold text-[#52685b]">
        หมวดหมู่:
      </span>
      <button
        onClick={() => handleSelectCategory(undefined)}
        className={`shrink-0 rounded-full border px-3 py-1 font-medium transition ${
          isAllActive
            ? "border-[#1b3b2b] bg-[#1b3b2b] text-white shadow-sm"
            : "border-[#dce6de] bg-white text-[#3a4d42] hover:bg-[#f0f5f0]"
        }`}
      >
        ทั้งหมด
      </button>
      {categories.map((c) => {
        const isActive = activeCategoryId === String(c.id);
        return (
          <button
            key={c.id}
            onClick={() => handleSelectCategory(c.id)}
            className={`shrink-0 rounded-full border px-3 py-1 font-medium transition ${
              isActive
                ? "border-[#1b3b2b] bg-[#1b3b2b] text-white shadow-sm"
                : "border-[#dce6de] bg-white text-[#3a4d42] hover:bg-[#f0f5f0]"
            }`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

export default function CategoryChips({
  categories,
}: {
  categories: Category[];
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
          <span className="mr-2 shrink-0 text-[11px] font-semibold text-[#52685b]">
            หมวดหมู่:
          </span>
          <button className="shrink-0 rounded-full bg-[#1b3b2b] px-3 py-1 font-medium text-white">
            ทั้งหมด
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className="shrink-0 rounded-full border border-[#dce6de] bg-white px-3 py-1 text-[#3a4d42]"
            >
              {c.name}
            </button>
          ))}
        </div>
      }
    >
      <CategoryChipsContent categories={categories} />
    </Suspense>
  );
}
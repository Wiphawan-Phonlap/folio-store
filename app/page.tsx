import { Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoryChips from "@/components/CategoryChips";
import BookCard from "@/components/BookCard";
import { getCoverUrl } from "@/lib/cover-url";
import { connection } from "next/server";
import { getCurrentOwnedProductIds } from "@/lib/ownership";

function sanitizeSearchQuery(query: string): string {
  // กรองอักขระที่อาจทำให้ PostgREST syntax ผิดพลาด เช่น , ( ) % " ' \ : .
  return query.replace(/[,()%"'\\:.]/g, " ").replace(/\s+/g, " ").trim();
}

async function HomeContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  await connection();
  const { q: rawQ, category } = await searchParams;
  const ownedIds = await getCurrentOwnedProductIds();
  const q = rawQ?.trim();

  let productsQuery = supabase.from("products").select("*").order("id");
  productsQuery = productsQuery.eq("is_published", true);

  if (category) {
    const categoryId = Number(category);
    if (!isNaN(categoryId)) {
      productsQuery = productsQuery.eq("category_id", categoryId);
    }
  }

  if (q) {
    const cleanQ = sanitizeSearchQuery(q);
    if (cleanQ) {
      productsQuery = productsQuery.or(
        `title.ilike.%${cleanQ}%,author.ilike.%${cleanQ}%`
      );
    } else {
      // กรณีคำค้นมีเฉพาะอักขระพิเศษที่ถูกกรองออกหมด
      productsQuery = productsQuery.eq("id", -999999);
    }
  }

  const [productsRes, categoriesRes] = await Promise.all([
    productsQuery,
    supabase.from("categories").select("*").order("id"),
  ]);

  if (productsRes.error) {
    return (
      <p className="text-sm text-red-600">
        เกิดข้อผิดพลาด: {productsRes.error.message}
      </p>
    );
  }

  const products = (productsRes.data ?? []).map((product) => ({
    ...product,
    cover_url: getCoverUrl(product.cover_path),
  }));
  const categories = categoriesRes.data ?? [];
  const isFiltering = !!(q || category);
  const featured = !isFiltering ? products.find((p) => p.is_featured) : null;

  const currentCategory = category
    ? categories.find((c) => String(c.id) === category)
    : null;

  let sectionTitle = "วรรณกรรมคัดสรรยอดนิยมประจำสัปดาห์";
  if (q && currentCategory) {
    sectionTitle = `ผลการค้นหา "${q}" ในหมวดหมู่ ${currentCategory.name} (${products.length} เล่ม)`;
  } else if (q) {
    sectionTitle = `ผลการค้นหาสำหรับ "${q}" (${products.length} เล่ม)`;
  } else if (currentCategory) {
    sectionTitle = `หมวดหมู่: ${currentCategory.name} (${products.length} เล่ม)`;
  }

  return (
    <div className="space-y-6">
      {featured && <Hero product={featured} ownedIds={ownedIds} />}
      <CategoryChips categories={categories} />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#142d20]">{sectionTitle}</h2>
          {isFiltering && (
            <Link
              href="/"
              className="text-xs font-semibold text-[#C5A059] hover:underline"
            >
              ล้างตัวกรองทั้งหมด
            </Link>
          )}
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-[#e3ece5] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mb-3 text-4xl">🔍</div>
            <p className="font-serif text-lg font-bold text-[#142d20]">
              ไม่พบหนังสือที่ค้นหา
            </p>
            <p className="mb-6 mt-1 text-xs text-[#71877a]">
              {q
                ? `ไม่พบผลลัพธ์ที่ตรงกับคำว่า "${q}"`
                : "ไม่มีหนังสือในหมวดหมู่นี้ในขณะนี้"}
            </p>
            <Link
              href="/"
              className="inline-block rounded-lg bg-[#1b3b2b] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#142d20]"
            >
              ล้างการค้นหา
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {products.map((p) => (
              <BookCard key={p.id} product={p} ownedIds={ownedIds} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <section className="mb-6 flex items-center gap-4 rounded-2xl border border-[#e3ece5] bg-white px-5 py-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#1b3b2b] font-serif text-2xl font-bold text-[#f6fbf5]">
            F
          </div>
          <div>
            <p className="font-serif text-xl font-bold text-[#142d20]">Folio &amp; Co.</p>
            <p className="mt-0.5 text-xs text-[#71877a]">
              พื้นที่สำหรับเรื่องเล่าที่คัดสรร และห้องสมุดดิจิทัลของคุณ
            </p>
          </div>
        </section>
        <Suspense
          fallback={<p className="text-xs text-[#71877a]">กำลังโหลด...</p>}
        >
          <HomeContent searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
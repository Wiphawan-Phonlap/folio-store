import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoryChips from "@/components/CategoryChips";
import BookCard from "@/components/BookCard";

async function HomeContent() {
  const [productsRes, categoriesRes] = await Promise.all([
    supabase.from("products").select("*").order("id"),
    supabase.from("categories").select("*").order("id"),
  ]);

  if (productsRes.error) {
    return <p>เกิดข้อผิดพลาด: {productsRes.error.message}</p>;
  }

  const products = productsRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const featured = products.find((p) => p.is_featured);

  return (
    <div className="space-y-6">
      {featured && <Hero product={featured} />}
      <CategoryChips categories={categories} />
      <section>
        <h2 className="mb-3 text-sm font-bold text-[#142d20]">
          วรรณกรรมคัดสรรยอดนิยมประจำสัปดาห์
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {products.map((p, i) => (
            <BookCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <Suspense fallback={<p>กำลังโหลด...</p>}>
          <HomeContent />
        </Suspense>
      </main>
    </>
  );
}
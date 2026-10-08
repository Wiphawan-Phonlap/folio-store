import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BookCard from "@/components/BookCard";

async function BookGrid() {
  const { data: products, error } = await supabase.from("products").select("*");

  if (error) return <p>เกิดข้อผิดพลาด: {error.message}</p>;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {products?.map((p, i) => (
        <BookCard key={p.id} product={p} index={i} />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <h2 className="mb-4 text-sm font-bold text-[#142d20]">
          วรรณกรรมคัดสรรยอดนิยมประจำสัปดาห์
        </h2>
        <Suspense fallback={<p>กำลังโหลด...</p>}>
          <BookGrid />
        </Suspense>
      </main>
    </>
  );
}
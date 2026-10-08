import { Suspense } from "react";
import { supabase } from "@/lib/supabase";

async function ProductList() {
  const { data: products, error } = await supabase.from("products").select("*");

  if (error) return <p>เกิดข้อผิดพลาด: {error.message}</p>;

  return (
    <ul className="space-y-2">
      {products?.map((p) => (
        <li key={p.id}>
          {p.title} — {p.author} — ฿{p.price}
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Folio & Co.</h1>
      <Suspense fallback={<p>กำลังโหลด...</p>}>
        <ProductList />
      </Suspense>
    </main>
  );
}
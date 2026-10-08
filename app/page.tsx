import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data: products, error } = await supabase.from("products").select("*");

  if (error) return <p>เกิดข้อผิดพลาด: {error.message}</p>;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Folio & Co.</h1>
      <ul className="space-y-2">
        {products?.map((p) => (
          <li key={p.id}>
            {p.title} — {p.author} — ฿{p.price}
          </li>
        ))}
      </ul>
    </main>
  );
}
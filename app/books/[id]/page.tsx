import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import AddToCartButton from "@/components/AddToCartButton";
import BuyNowButton from "@/components/BuyNowButton";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { getCoverUrl } from "@/lib/cover-url";
import PreviewButton from "@/components/PreviewButton";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCurrentOwnedProductIds } from "@/lib/ownership";
import IntroductionSection from "@/components/IntroductionSection";
import { coverColor } from "@/lib/cover-colors";

export const instant = false;

async function BookDetailsContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const { data: product, error } = await supabase
    .from("products")
    .select("id, title, author, price, subtitle, description, introduction, is_featured, category_id, cover_path, preview_path")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !product) notFound();
  const ownedIds = await getCurrentOwnedProductIds();

  const bookCoverColor = coverColor(id);
  const coverUrl = getCoverUrl(product.cover_path);

  return (
    <div className="min-h-screen bg-[#F6FBF5] text-[#142D20]">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Link href="/" className="text-xs font-medium text-[#71877A] hover:text-[#1B3B2B]">
          ← กลับไปเลือกหนังสือ
        </Link>

        <section className="mt-6 grid gap-8 rounded-[12px] border border-[#E3ECE5] bg-white p-5 shadow-sm md:grid-cols-[280px_1fr] md:p-8">
          <div
            className="relative flex aspect-[3/4] items-center justify-center rounded-[12px] p-8 text-center shadow-lg"
            style={{ backgroundColor: bookCoverColor }}
          >
            {coverUrl ? (
              <Image src={coverUrl} alt={`ปก ${product.title}`} fill sizes="(max-width: 768px) 90vw, 280px" className="rounded-[12px] object-cover" />
            ) : <div>
              <p className="mb-8 text-[10px] uppercase tracking-[0.2em] text-[#C5A059]">
                Folio &amp; Co.
              </p>
              <h1 className="font-serif text-3xl font-bold italic leading-tight text-white">
                {product.title}
              </h1>
              <p className="mt-8 border-t border-white/20 pt-3 text-xs text-[#D9E5DB]">
                {product.author}
              </p>
            </div>}
          </div>

          <div className="flex flex-col justify-center">
            {product.is_featured && (
              <span className="mb-3 w-fit rounded-full bg-[#F4EBDD] px-3 py-1 text-[11px] font-semibold text-[#8B6A2E]">
                ✦ วรรณกรรมคัดสรร
              </span>
            )}
            <h2 className="font-serif text-3xl font-bold text-[#142D20] md:text-4xl">
              {product.title}
            </h2>
            <p className="mt-2 text-sm text-[#71877A]">โดย {product.author}</p>
            {product.subtitle && (
              <p className="mt-6 font-serif text-lg italic text-[#52685B]">
                {product.subtitle}
              </p>
            )}
            <p className="mt-5 text-sm leading-7 text-[#71877A]">
              {product.description || "เรื่องเล่าที่คัดสรรมาเพื่อการอ่านอย่างละเมียดในทุกช่วงเวลา"}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span className="font-serif text-2xl font-bold text-[#1B3B2B]">
                ฿{Number(product.price).toLocaleString("th-TH")}
              </span>
              <AddToCartButton product={product} owned={ownedIds.includes(product.id)} />
              <BuyNowButton productId={product.id} title={product.title} owned={ownedIds.includes(product.id)} />
            </div>
            <div id="preview" className="mt-8 border-t border-[#E3ECE5] pt-5">
              <p className="text-xs font-semibold text-[#52685B]">ทดลองอ่านตัวอย่าง</p>
              <p className="mt-2 text-xs leading-6 text-[#71877A]">
                เปิดอ่านบทนำและทำความรู้จักกับหนังสือเล่มนี้ก่อนตัดสินใจซื้อ
              </p>
              <PreviewButton productId={product.id} available={!!product.preview_path} />
            </div>
          </div>
          {product.introduction && <div className="md:col-span-2"><IntroductionSection introduction={product.introduction} /></div>}
        </section>
      </main>
    </div>
  );
}

export default function BookDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F6FBF5] p-10 text-center text-sm text-[#71877a]">กำลังโหลดหนังสือ...</main>}>
      <BookDetailsContent params={params} />
    </Suspense>
  );
}

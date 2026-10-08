import type { Product } from "./BookCard";

export default function Hero({ product }: { product: Product }) {
  return (
    <section className="rounded-2xl border border-[#e3ece5] bg-gradient-to-r from-white to-[#eff5f0] p-6 shadow-sm md:p-8">
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="max-w-xl">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#e8efe9] px-3 py-1 text-[11px] font-semibold text-[#1b3b2b]">
            <span className="text-[#c5a059]">✦</span> วรรณกรรมคัดสรรประจำเดือน
          </span>
          <h1 className="mb-2 font-serif text-3xl font-bold leading-tight text-[#142d20] md:text-4xl">
            {product.title}
          </h1>
          {product.subtitle && (
            <p className="mb-2 font-serif text-sm italic text-[#52685b]">
              {product.subtitle}
            </p>
          )}
          {product.description && (
            <p className="mb-5 text-xs text-[#71877a]">{product.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-lg bg-[#1b3b2b] px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-[#142d20]">
              สั่งซื้อฉบับดิจิทัล ฿{product.price}
            </button>
            <button className="rounded-lg border border-[#d0dcd2] bg-white px-4 py-2.5 text-xs font-medium text-[#1b3b2b] hover:bg-[#f9fcf9]">
              ทดลองอ่านตัวอย่างฟรี
            </button>
          </div>
        </div>

        <div className="flex h-56 w-40 shrink-0 flex-col justify-between rounded-l-sm rounded-r-lg border-l-4 border-[#0d1812] bg-[#16291e] p-4 text-center shadow-xl">
          <div className="text-[9px] uppercase tracking-widest text-[#c5a059]">
            Folio Deluxe Edition
          </div>
          <div className="font-serif text-lg font-bold italic leading-snug text-white">
            {product.title}
          </div>
          <div className="border-t border-[#294b37] pt-2 text-[8px] text-[#c5a059]">
            ไร้ DRM
          </div>
        </div>
      </div>
    </section>
  );
}
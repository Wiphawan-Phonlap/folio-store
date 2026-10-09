import AddToCartButton from "./AddToCartButton";
import Link from "next/link";
import Image from "next/image";
import { coverColor } from "@/lib/cover-colors";

export type Product = {
  id: number;
  title: string;
  author: string;
  price: number;
  description?: string | null;
  subtitle?: string | null;
  is_featured?: boolean | null;
  category_id?: number | null;
  cover_path?: string | null;
  cover_url?: string | null;
  pdf_path?: string | null;
  epub_path?: string | null;
  preview_path?: string | null;
  is_published?: boolean | null;
};
export default function BookCard({
  product,
  ownedIds = [],
}: {
  product: Product;
  ownedIds?: number[];
}) {
  const color = coverColor(product.id);

  return (
    <div className="rounded-[12px] border border-[#e3ece5] bg-white p-3 transition hover:border-[#1b3b2b] hover:shadow-sm">
      <Link href={`/books/${product.id}`} aria-label={`ดูรายละเอียด ${product.title}`}>
      <div
        className="mb-3 flex h-40 items-center justify-center rounded-lg p-4 text-center"
        style={{ backgroundColor: color }}
      >
        {product.cover_url ? (
          <div className="relative h-full w-full">
            <Image src={product.cover_url} alt={`ปก ${product.title}`} fill sizes="(max-width: 768px) 50vw, 240px" className="rounded object-cover" />
          </div>
        ) : (
          <span className="font-serif text-base italic leading-tight text-white">{product.title}</span>
        )}
      </div>
      <div className="truncate text-sm font-bold text-[#142d20]">
        {product.title}
      </div>
      <div className="text-xs text-[#71877a]">{product.author}</div>
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-bold text-[#1b3b2b]">
          ฿{product.price}
        </span>
        <AddToCartButton product={product} owned={ownedIds.includes(product.id)} />
      </div>
    </div>
  );
}
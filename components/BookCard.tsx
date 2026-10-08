export type Product = {
  id: number;
  title: string;
  author: string;
  price: number;
};

const coverColors = ["#1b3b2b", "#542b1a", "#233748", "#4a1e2b"];

export default function BookCard({
  product,
  index,
}: {
  product: Product;
  index: number;
}) {
  const color = coverColors[index % coverColors.length];

  return (
    <div className="rounded-xl border border-[#e3ece5] bg-white p-3 transition hover:border-[#1b3b2b]">
      <div
        className="mb-3 flex h-40 items-center justify-center rounded-lg p-4 text-center"
        style={{ backgroundColor: color }}
      >
        <span className="font-serif text-base italic leading-tight text-white">
          {product.title}
        </span>
      </div>
      <div className="truncate text-sm font-bold text-[#142d20]">
        {product.title}
      </div>
      <div className="text-xs text-[#71877a]">{product.author}</div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-bold text-[#1b3b2b]">
          ฿{product.price}
        </span>
        <button className="rounded bg-[#f0f5f0] px-2 py-1 text-[#1b3b2b] hover:bg-[#1b3b2b] hover:text-white">
          ＋
        </button>
      </div>
    </div>
  );
}
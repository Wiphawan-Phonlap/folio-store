export type Category = {
  id: number;
  name: string;
};

export default function CategoryChips({
  categories,
}: {
  categories: Category[];
}) {
  return (
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
          className="shrink-0 rounded-full border border-[#dce6de] bg-white px-3 py-1 text-[#3a4d42] hover:bg-[#f0f5f0]"
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
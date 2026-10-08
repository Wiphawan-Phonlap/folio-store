import AuthButton from "./AuthButton";
import CartButton from "./CartButton";

export default function Header() {
  return (
    <header className="border-b border-[#e3ece5] bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <a href="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-[#1b3b2b] font-serif text-lg font-bold text-[#f6fbf5]">
            F
          </div>
          <div>
            <span className="whitespace-nowrap font-serif text-xl font-bold text-[#142d20]">
              Folio &amp; Co.
            </span>
            <span className="hidden whitespace-nowrap text-[9px] uppercase tracking-widest text-[#71877a] sm:block">
              Est. 1924 • Literary E-Book
            </span>
          </div>
        </a>

        <input
          type="text"
          placeholder="ค้นหาชื่อหนังสือ ผู้แต่ง หรือ ISBN..."
          className="hidden min-w-0 flex-1 rounded-full border border-transparent bg-[#f0f5f0] px-4 py-2 text-xs outline-none focus:border-[#1b3b2b] focus:bg-white md:block md:max-w-[16rem] lg:max-w-xs"
        />

        <nav className="flex shrink-0 items-center gap-4 whitespace-nowrap text-xs font-medium text-[#3a4d42] md:gap-5">
          <a href="#" className="hidden hover:text-[#1b3b2b] md:block">
            สำรวจทั้งหมด
          </a>
          <a href="/library" className="hidden hover:text-[#1b3b2b] md:block">
            ห้องสมุดของฉัน
          </a>
          <CartButton />
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
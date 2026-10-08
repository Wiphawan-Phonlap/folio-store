import Link from "next/link";
import AuthButton from "./AuthButton";
import CartButton from "./CartButton";
import SearchBar from "./SearchBar";
import AdminNavLink from "./AdminNavLink";

export default function Header() {
  return (
    <header className="border-b border-[#e3ece5] bg-white sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:gap-4 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3">
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
        </Link>

        {/* ช่องค้นหาหนังสือ */}
        <div className="min-w-0 flex-1 max-w-[14rem] sm:max-w-[16rem] lg:max-w-xs">
          <SearchBar />
        </div>

        <nav className="flex shrink-0 items-center gap-3 whitespace-nowrap text-xs font-medium text-[#3a4d42] md:gap-4">
          <Link href="/" className="hidden hover:text-[#1b3b2b] md:block">
            สำรวจทั้งหมด
          </Link>
          <Link href="/library" className="hidden hover:text-[#1b3b2b] md:block">
            ห้องสมุดของฉัน
          </Link>
          <AdminNavLink />
          <CartButton />
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
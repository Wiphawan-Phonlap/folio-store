"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SearchProduct = {
  id: number;
  title: string;
  author?: string | null;
  price?: number | null;
  cover_url?: string | null;
};

function SearchBarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQ = searchParams.get("q") ?? "";
  const [searchTerm, setSearchTerm] = useState(currentQ);
  const [suggestions, setSuggestions] = useState<SearchProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const query = searchTerm.trim();
    if (query.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("ค้นหาหนังสือไม่สำเร็จ");
        const data = (await response.json()) as { products?: SearchProduct[] };
        setSuggestions(data.products || []);
        setIsOpen(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = searchTerm.trim();

    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }

    const queryString = params.toString();
    setIsOpen(false);
    router.push(queryString ? `/?${queryString}` : "/");
  }

  return (
    <form
      ref={searchRef}
      onSubmit={handleSubmit}
      className="relative flex min-w-0 flex-1 items-center md:max-w-[16rem] lg:max-w-xs"
    >
      <input
        key={currentQ}
        type="text"
        value={searchTerm}
        onChange={(e) => {
          const value = e.target.value;
          setSearchTerm(value);
          if (value.trim().length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            setIsLoading(false);
          }
        }}
        onFocus={() => {
          if (searchTerm.trim().length >= 2) setIsOpen(true);
        }}
        placeholder="ค้นหาชื่อหนังสือ หรือ ผู้แต่ง..."
        className="w-full rounded-full border border-transparent bg-[#f0f5f0] py-2 pl-4 pr-9 text-xs outline-none transition focus:border-[#1b3b2b] focus:bg-white focus:ring-1 focus:ring-[#1b3b2b]"
      />
      {searchTerm && (
        <button
          type="button"
          onClick={() => {
            setSearchTerm("");
            const params = new URLSearchParams(searchParams.toString());
            params.delete("q");
            const qs = params.toString();
            router.push(qs ? `/?${qs}` : "/");
          }}
          className="absolute right-7 text-xs text-gray-400 hover:text-gray-600"
          title="ล้างคำค้นหา"
        >
          ✕
        </button>
      )}
      <button
        type="submit"
        aria-label="ค้นหา"
        className="absolute right-2.5 text-[#52685b] hover:text-[#1b3b2b]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-3.5 w-3.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </button>
      {isOpen && searchTerm.trim().length >= 2 && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-[#e3ece5] bg-white shadow-lg">
          {isLoading ? (
            <p className="px-4 py-3 text-xs text-[#71877a]">กำลังค้นหา...</p>
          ) : suggestions.length > 0 ? (
            <ul className="py-1">
              {suggestions.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      router.push(`/books/${product.id}`);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-[#f0f5f0]"
                  >
                    <span className="flex h-10 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-[#1b3b2b] text-[8px] text-white">
                      {product.cover_url ? (
                        <img src={product.cover_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        "F"
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-[#142d20]">{product.title}</span>
                      <span className="block truncate text-[10px] text-[#71877a]">{product.author || "ไม่ระบุผู้แต่ง"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-xs text-[#71877a]">ไม่พบหนังสือที่ค้นหา</p>
          )}
        </div>
      )}
    </form>
  );
}

export default function SearchBar() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-w-0 flex-1 items-center md:max-w-[16rem] lg:max-w-xs">
          <input
            type="text"
            disabled
            placeholder="ค้นหาชื่อหนังสือ หรือ ผู้แต่ง..."
            className="w-full rounded-full border border-transparent bg-[#f0f5f0] py-2 pl-4 pr-9 text-xs outline-none"
          />
        </div>
      }
    >
      <SearchBarContent />
    </Suspense>
  );
}

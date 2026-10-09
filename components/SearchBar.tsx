"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SearchBarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQ = searchParams.get("q") ?? "";
  const [searchTerm, setSearchTerm] = useState(currentQ);

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
    router.push(queryString ? `/?${queryString}` : "/");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex min-w-0 flex-1 items-center md:max-w-[16rem] lg:max-w-xs"
    >
      <input
        key={currentQ}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
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

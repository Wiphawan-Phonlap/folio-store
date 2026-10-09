"use client";

import { useState } from "react";

export default function IntroductionSection({ introduction }: { introduction: string }) {
  const [expanded, setExpanded] = useState(false);
  const paragraphs = introduction.split(/\n\s*\n/).filter(Boolean);
  return (
    <section className="mt-8 border-t border-[#E3ECE5] pt-7">
      <h3 className="font-serif text-2xl font-bold text-[#142D20]">บทนำ</h3>
      <div className={`mt-4 max-w-prose space-y-4 text-sm leading-relaxed text-[#52685B] ${expanded ? "" : "max-h-56 overflow-hidden"}`}>
        {paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>)}
      </div>
      <button onClick={() => setExpanded((value) => !value)} className="mt-4 text-xs font-semibold text-[#1B3B2B] underline">
        {expanded ? "ย่อ" : "อ่านต่อ"}
      </button>
    </section>
  );
}

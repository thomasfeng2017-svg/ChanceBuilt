"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        // Preserve the department the customer is browsing, drop pagination.
        const next = new URLSearchParams();
        if (q) next.set("q", q);
        const category = params.get("category");
        if (category) next.set("category", category);
        router.push(`/parts${next.toString() ? `?${next}` : ""}`);
      }}
      className="relative"
    >
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search part name, brand or part number"
        aria-label="Search parts"
        className="focus-ring w-full rounded-lg border border-field bg-surface py-2.5 pr-3 pl-10 text-sm text-text transition-colors placeholder:text-muted/70 hover:border-muted/40"
      />
    </form>
  );
}

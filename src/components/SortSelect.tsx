"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const OPTIONS = [
  { value: "relevance", label: "Best match" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Name: A–Z" },
  { value: "newest", label: "Newest" },
];

/**
 * `defaultSort` must match the order the page actually applies when no `sort`
 * param is present, or the control shows one thing while the grid does another.
 */
export function SortSelect({ defaultSort = "relevance" }: { defaultSort?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Sort</span>
      <select
        className="select-field focus-ring rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium"
        value={params.get("sort") ?? defaultSort}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === defaultSort) next.delete("sort");
          else next.set("sort", e.target.value);
          next.delete("page"); // a new sort order invalidates the current page
          router.push(`${pathname}${next.toString() ? `?${next}` : ""}`);
        }}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

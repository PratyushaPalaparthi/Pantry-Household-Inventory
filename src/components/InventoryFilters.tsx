"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, MapPin, Boxes, X } from "lucide-react";
import { useState } from "react";

export function InventoryFilters({
  categories,
  locations,
  tags,
}: {
  categories: string[];
  locations: string[];
  tags: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setParam("q", q || null);
  }

  const activeCategory = searchParams.get("category");
  const activeLocation = searchParams.get("location");
  const activeTag = searchParams.get("tag");
  const lowStock = searchParams.get("lowStockOnly") === "true";
  const expiring = searchParams.get("expiringOnly") === "true";
  const hasFilters = Boolean(
    activeCategory || activeLocation || activeTag || lowStock || expiring || searchParams.get("q")
  );

  return (
    <div className="space-y-3">
      <form onSubmit={submitSearch} className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input pl-9"
          placeholder="Search by name, category, brand, or location…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>

      {/* Dropdowns rather than chips for category and location: with a real
          pantry these lists get long, and chips wrap into an unusable wall. */}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-xs text-muted">
          <MapPin size={14} className="shrink-0" />
          <select
            className="input"
            value={activeLocation ?? ""}
            onChange={(e) => setParam("location", e.target.value || null)}
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <Boxes size={14} className="shrink-0" />
          <select
            className="input"
            value={activeCategory ?? ""}
            onChange={(e) => setParam("category", e.target.value || null)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setParam("lowStockOnly", lowStock ? null : "true")}
          className={lowStock ? "badge-danger" : "badge"}
          style={!lowStock ? { background: "var(--surface)", border: "1px solid var(--border)" } : undefined}
        >
          Low stock only
        </button>

        <button
          onClick={() => setParam("expiringOnly", expiring ? null : "true")}
          className={expiring ? "badge-warning" : "badge"}
          style={!expiring ? { background: "var(--surface)", border: "1px solid var(--border)" } : undefined}
        >
          Expiring soon
        </button>

        {hasFilters && (
          <button
            onClick={() => router.push(pathname)}
            className="badge inline-flex items-center gap-1"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Tags:</span>
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setParam("tag", activeTag === t ? null : t)}
              className={activeTag === t ? "badge-brand" : "badge"}
              style={activeTag !== t ? { background: "var(--surface)", border: "1px solid var(--border)" } : undefined}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

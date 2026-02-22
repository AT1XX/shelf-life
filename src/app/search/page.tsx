"use client";

import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import ProductResultCard from "@/components/ProductResultCard";

type ProductDTO = {
  barcode: string;
  name: string;
  shelfLifeDays: number;
  notes?: string | null;
  updatedAt?: string;
};

function toDateInputValue(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProductDTO[]>([]);
  const [selected, setSelected] = useState<ProductDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [thawDateStr, setThawDateStr] = useState(() => toDateInputValue(new Date()));
  const thawDate = useMemo(() => new Date(thawDateStr + "T00:00:00"), [thawDateStr]);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setSelected(null);

      if (!canSearch) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/products?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!cancelled) setResults(data.results ?? []);
      } catch {
        if (!cancelled) setError("Could not search right now. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, canSearch]);

  return (
    <Shell
      title="Search frozen item"
      subtitle="Search by product name to display shelf life and the date to write on the gun."
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="text-sm font-medium">Product name</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., croissant, danish, muffin..."
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
            <div className="mt-2 text-xs text-slate-500">Type at least 2 characters.</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="text-sm font-medium">Thawed date</label>
            <input
              type="date"
              value={thawDateStr}
              onChange={(e) => setThawDateStr(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
            <div className="mt-2 text-xs text-slate-500">Thaw day counts as Day 1.</div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Results</p>
              {loading && <p className="text-xs text-slate-500">Searching…</p>}
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {results.length === 0 && !loading ? (
                <p className="py-6 text-sm text-slate-500">No results yet.</p>
              ) : (
                results.map((p) => (
                  <button
                    key={p.barcode}
                    onClick={async () => {
                      // fetch full product to include updatedAt + notes
                      const res = await fetch(`/api/products/${encodeURIComponent(p.barcode)}`);
                      const data = await res.json().catch(() => null);
                      if (res.ok && data) setSelected(data);
                      else setSelected(p);
                    }}
                    className="flex w-full items-start justify-between gap-3 py-3 text-left hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-slate-500">Barcode {p.barcode}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-700">
                      {p.shelfLifeDays}d
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="min-h-[160px]">
            {selected ? (
              <ProductResultCard product={selected as any} thawDate={thawDate} />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
                Select a product to view the gun date.
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

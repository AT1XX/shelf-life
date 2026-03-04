"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Shell from "@/components/Shell";
import ProductResultCard from "@/components/ProductResultCard";

type ProductDTO = {
  barcode: string;
  name: string;
  shelfLifeDays: number;
  notes?: string | null;
  updatedAt?: string;
  ddv?: boolean | null;
};

function toDateInputValue(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function isLgUp() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 1024px)").matches;
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      // @ts-ignore
      navigator.vibrate(pattern);
    } catch {}
  }
}

function SwipeableSheet({
  children,
  onClose,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  subtitle?: string;
}) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number | null>(null);
  const currentY = useRef(0);
  const [dragging, setDragging] = useState(false);

  function handleTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
    setDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      currentY.current = delta;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${delta}px)`;
      }
    }
  }

  function handleTouchEnd() {
    setDragging(false);

    if (currentY.current > 120) {
      onClose();
    } else {
      if (sheetRef.current) sheetRef.current.style.transform = "translateY(0)";
    }

    startY.current = null;
    currentY.current = 0;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 -top-24 bg-black/10" onClick={onClose} />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={[
          "relative mx-auto max-w-5xl rounded-t-2xl border border-slate-200 bg-white shadow-2xl",
          "transition-transform duration-200",
          dragging ? "duration-0" : "",
        ].join(" ")}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{title}</p>
            {subtitle ? <p className="text-xs text-slate-500 truncate">{subtitle}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const desktopResultRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProductDTO[]>([]);
  const [selected, setSelected] = useState<ProductDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [thawDateStr, setThawDateStr] = useState(() => toDateInputValue(new Date()));
  const thawDate = useMemo(() => new Date(thawDateStr + "T00:00:00"), [thawDateStr]);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  // Mobile sheet
  const [sheetOpen, setSheetOpen] = useState(false);

  // Autofocus search input
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Close sheet on Escape (desktop)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSheetOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced search
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setSelected(null);
      setSheetOpen(false);

      if (!canSearch) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/products?query=${encodeURIComponent(query)}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
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

  function scrollToDesktopResult() {
    setTimeout(() => {
      desktopResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function selectProduct(p: ProductDTO) {
    setError(null);
    vibrate(20);

    try {
      const res = await fetch(`/api/products/${encodeURIComponent(p.barcode)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      const full = res.ok && data ? (data as ProductDTO) : p;

      setSelected(full);

      if (!isLgUp()) {
        setSheetOpen(true);
        vibrate(30);
      } else {
        scrollToDesktopResult();
      }
    } catch {
      setSelected(p);
      if (!isLgUp()) setSheetOpen(true);
      else scrollToDesktopResult();
    }
  }

  return (
    <Shell
      title="Search frozen item"
      subtitle="Search by product name to display shelf life and the date to input into the gun."
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="text-sm font-medium">Product name</label>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., croissant, danish, muffin..."
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="search"
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
          {/* Results */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Results</p>
              {loading && <p className="text-xs text-slate-500">Searching…</p>}
            </div>

            <div className="mt-3 max-h-[55vh] overflow-auto divide-y divide-slate-100 rounded-xl border border-slate-100">
              {results.length === 0 && !loading ? (
                <p className="p-4 text-sm text-slate-500">No results yet.</p>
              ) : (
                results.map((p) => (
                  <button
                    key={p.barcode}
                    onClick={() => selectProduct(p)}
                    className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
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

          {/* Desktop sticky card */}
          <div ref={desktopResultRef} className="hidden lg:block lg:sticky lg:top-24 h-fit">
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

      {/* Mobile bottom sheet with swipe-down to close */}
      <div className="lg:hidden">
        {sheetOpen && selected ? (
          <SwipeableSheet
            onClose={() => setSheetOpen(false)}
            title={selected.name}
            subtitle={`Barcode ${selected.barcode}`}
          >
            <div className="p-4">
              <ProductResultCard product={selected as any} thawDate={thawDate} />
            </div>
          </SwipeableSheet>
        ) : null}
      </div>
    </Shell>
  );
}
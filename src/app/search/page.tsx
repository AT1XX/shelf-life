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

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      // @ts-ignore
      navigator.vibrate(pattern);
    } catch {}
  }
}

function useMediaQuery(query: string, initial = false) {
  const [matches, setMatches] = useState(initial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    if (m.addEventListener) m.addEventListener("change", onChange);
    else m.addListener(onChange);
    return () => {
      if (m.removeEventListener) m.removeEventListener("change", onChange);
      else m.removeListener(onChange);
    };
  }, [query]);

  return matches;
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
  const contentRef = useRef<HTMLDivElement | null>(null);

  const startY = useRef<number | null>(null);
  const currentY = useRef(0);
  const [dragging, setDragging] = useState(false);

  // Lock background scroll while open (iPhone-friendly)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;

    const scrollY = window.scrollY;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);

  function resetTransform() {
    if (sheetRef.current) sheetRef.current.style.transform = "translateY(0)";
    currentY.current = 0;
    startY.current = null;
  }

  // ✅ Start dragging ONLY if sheet content is scrolled to top
  function onTouchStart(e: React.TouchEvent) {
    const scroller = contentRef.current;
    const scrollTop = scroller ? scroller.scrollTop : 0;

    // If user is mid-scroll in content, don't begin dismiss gesture
    if (scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;

    const delta = e.touches[0].clientY - startY.current;

    // Only drag down
    if (delta > 0) {
      currentY.current = delta;
      if (sheetRef.current) sheetRef.current.style.transform = `translateY(${delta}px)`;

      // ✅ Prevent iOS rubber-band scroll while dismissing
      e.preventDefault();
    }
  }

  function onTouchEnd() {
    if (startY.current === null) return;

    setDragging(false);

    if (currentY.current > 120) {
      onClose();
      return;
    }

    resetTransform();
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/25"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={[
          "absolute inset-x-0 bottom-0 mx-auto max-w-5xl",
          "rounded-t-2xl border border-slate-200 bg-white shadow-2xl",
          "transition-transform",
          dragging ? "duration-0" : "duration-200",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
          // Important: allow touch gestures
          touchAction: "pan-y",
        }}
        // ✅ Swipe down anywhere on the sheet container
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Handle (still nice visually, but no longer required) */}
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

        {/* Content scrolls */}
        <div
          ref={contentRef}
          className="max-h-[75vh] overflow-auto overscroll-contain"
        >
          {children}
        </div>
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

  // desktop breakpoint (lg)
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Mobile sheet
  const [sheetOpen, setSheetOpen] = useState(false);

  // Autofocus search input
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Close sheet on Escape
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

      // close keyboard on iPhone after selection
      inputRef.current?.blur();

      if (!isDesktop) {
        setSheetOpen(true);
        vibrate(30);
      } else {
        scrollToDesktopResult();
      }
    } catch {
      setSelected(p);
      inputRef.current?.blur();
      if (!isDesktop) setSheetOpen(true);
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
              // ✅ 16px prevents iOS Safari zoom
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 h-12 text-[16px] outline-none focus:ring-2 focus:ring-slate-300"
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
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 h-12 text-[16px] leading-none outline-none focus:ring-2 focus:ring-slate-300"
              style={{ WebkitAppearance: "none" }}
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

            {/* iPhone-friendly: capped list height; no endless scrolling */}
            <div className="mt-3 max-h-[55vh] overflow-auto overscroll-contain divide-y divide-slate-100 rounded-xl border border-slate-100">
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
                    <span className="text-xs font-semibold text-slate-700">{p.shelfLifeDays}d</span>
                  </button>
                ))
              )}
            </div>

            {/* Helpful hint for mobile */}
            {!isDesktop ? (
              <p className="mt-3 text-xs text-slate-500">
                Tap a result to open details. Swipe down to close.
              </p>
            ) : null}
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

      {/* Mobile bottom sheet */}
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
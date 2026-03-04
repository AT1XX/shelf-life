"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import Shell from "@/components/Shell";
import ProductResultCard from "@/components/ProductResultCard";

type ProductDTO = {
  barcode: string;
  name: string;
  shelfLifeDays: number;
  notes?: string | null;
  updatedAt: string;
};

function toDateInputValue(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function looksLikeBarcode(v: string) {
  // UPC-A (12), EAN-13 (13), EAN-14 (14)
  return /^\d{12,14}$/.test(v.trim());
}

function isMobileUA() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<any>(null);
  const hasResultRef = useRef(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState<string>("");
  const [handheldValue, setHandheldValue] = useState("");
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [thawDateStr, setThawDateStr] = useState(() => toDateInputValue(new Date()));
  const thawDate = useMemo(() => new Date(thawDateStr + "T00:00:00"), [thawDateStr]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => setIsMobile(isMobileUA()), []);

  function scrollToResult() {
    // Small delay helps on mobile after state updates/layout changes
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function lookupProduct(codeRaw: string) {
    const code = codeRaw.trim();
    if (!code) return;

    setBarcode(code);
    setError(null);
    setProduct(null);

    try {
      const res = await fetch(`/api/products/${encodeURIComponent(code)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setProduct(null);
        setError(data?.message ?? "Product not found. Request this item to be added.");
        scrollToResult();
        return;
      }

      setProduct(data as ProductDTO);
      setError(null);
      scrollToResult();
    } catch {
      setProduct(null);
      setError("Network error while looking up product.");
      scrollToResult();
    }
  }

  function stopCamera() {
    try {
      controlsRef.current?.stop();
    } catch {}
    controlsRef.current = null;
    setScanning(false);
  }

  // Focus handheld input on non-mobile (Zebra workflow)
  useEffect(() => {
    if (!isMobile) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isMobile]);

  // Camera scan effect
  useEffect(() => {
    if (!scanning) return;

    let alive = true;
    const reader = new BrowserMultiFormatReader();

    hasResultRef.current = false;
    setError(null);
    setProduct(null);

    (async () => {
      try {
        if (!videoRef.current) return;

        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          async (result, err) => {
            if (!alive) return;
            if (hasResultRef.current) return;

            if (result) {
              hasResultRef.current = true;
              const text = result.getText().trim();

              stopCamera();
              await lookupProduct(text);
              return;
            }

            if (err) {
              const name = (err as any)?.name;

              // normal scanning noise
              if (name === "NotFoundException") return;

              // benign stop/shutdown errors
              if (
                name === "AbortError" ||
                name === "NotAllowedError" ||
                name === "NotReadableError" ||
                name === "NotFoundError"
              ) {
                return;
              }

              if (!hasResultRef.current) {
                setError("Camera scan error. Try better lighting and hold steady.");
                scrollToResult();
              }
            }
          }
        );
      } catch {
        setError("Camera access denied. Please allow permission and try again.");
        stopCamera();
        scrollToResult();
      }
    })();

    return () => {
      alive = false;
      stopCamera();
      try {
        (reader as any)?.reset?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <Shell
      title="Scan frozen item"
      subtitle="Use a handheld scanner or your phone camera to display shelf life and the date to input into the gun."
    >
      {/* Mobile-first layout: stacks nicely on phone, side-by-side on desktop */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT: Scan controls */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Scan</p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setProduct(null);
                  stopCamera();
                  inputRef.current?.focus();
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                title="Use handheld scanner or type barcode"
              >
                Handheld / Type
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setProduct(null);
                  setScanning((s) => {
                    const next = !s;
                    if (s) stopCamera();
                    return next;
                  });
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                title="Use camera scanner"
              >
                {scanning ? "Stop camera" : "Camera scan"}
              </button>
            </div>
          </div>

          {/* Handheld (Zebra) / Manual input */}
          <div className="mt-4">
            <label className="text-sm font-medium">Barcode</label>
            <input
              ref={inputRef}
              value={handheldValue}
              onChange={async (e) => {
                const v = e.target.value;
                setHandheldValue(v);

                // Auto-submit once it looks complete (helps Zebra even without Enter)
                const trimmed = v.trim();
                if (looksLikeBarcode(trimmed)) {
                  await lookupProduct(trimmed);
                  setHandheldValue("");
                }
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  await lookupProduct(handheldValue);
                  setHandheldValue("");
                }
              }}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="Tap here, then scan with Zebra (or type digits)"
              inputMode="numeric"
              autoComplete="off"
            />

            <p className="mt-2 text-xs text-slate-500">
              Supported Barcode Types: UPC-A, EAN-13, EAN-14
              <br />
              {isMobile ? "On smart devices, camera scan is recommended." : ""}
            </p>
          </div>

          {/* ✅ Camera preview only when active */}
          {scanning ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <video
                ref={videoRef}
                className="h-[320px] w-full object-cover"
                muted
                playsInline
              />
            </div>
          ) : null}

          {/* Thaw date + last scan */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Thawed date</label>
              <input
                type="date"
                value={thawDateStr}
                onChange={(e) => setThawDateStr(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
              <p className="mt-2 text-xs text-slate-500">
                Store policy: 1 full thaw day, then shelf life starts.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">Last scan</p>
              <p className="mt-1 text-sm text-slate-800">
                {barcode ? (
                  <span className="font-mono font-semibold">{barcode}</span>
                ) : (
                  <span className="text-slate-500">No barcode scanned yet.</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Result (scroll target) */}
        <div ref={resultRef} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
              <div className="mt-3">
                <a
                  href={`/request?barcode=${encodeURIComponent(barcode)}`}
                  className="text-sm font-semibold text-red-700 underline"
                >
                  Request this item to be added
                </a>
              </div>
            </div>
          )}

          {product ? (
            <ProductResultCard product={product as any} thawDate={thawDate} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Scan a product to see shelf life and the gun date.
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
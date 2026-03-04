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
  return /^\d{11,14}$/.test(v.trim()); // allow 11-14 (Zebra sometimes drops a digit)
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      // @ts-ignore
      navigator.vibrate(pattern);
    } catch {}
  }
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<any>(null);
  const hasResultRef = useRef(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastTipAtRef = useRef(0); // throttle scan tips

  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState<string>("");
  const [handheldValue, setHandheldValue] = useState("");

  const [product, setProduct] = useState<ProductDTO | null>(null);

  // "Hard" errors (network/product not found/permissions)
  const [error, setError] = useState<string | null>(null);

  // "Soft" scan guidance shown inside camera card (doesn't scroll page)
  const [scanTip, setScanTip] = useState<string | null>(null);

  const [thawDateStr, setThawDateStr] = useState(() => toDateInputValue(new Date()));
  const thawDate = useMemo(() => new Date(thawDateStr + "T00:00:00"), [thawDateStr]);

  async function lookupProduct(codeRaw: string) {
    const code = codeRaw.trim();
    if (!code) return;

    setBarcode(code);
    setError(null);
    setProduct(null);

    try {
      const res = await fetch(`/api/products/${encodeURIComponent(code)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setProduct(null);
        setError(data?.message ?? "Product not found. Request this item to be added.");
        return;
      }

      setProduct(data as ProductDTO);
      setError(null);
      vibrate(40);
    } catch {
      setProduct(null);
      setError("Network error while looking up product.");
      vibrate([60, 80, 60]);
    }
  }

  function stopCamera() {
    try {
      controlsRef.current?.stop();
    } catch {}
    controlsRef.current = null;
    setScanning(false);
  }

  function setTipThrottled(msg: string) {
    const now = Date.now();
    if (now - lastTipAtRef.current < 800) return; // max ~1 update per 0.8s
    lastTipAtRef.current = now;
    setScanTip(msg);
  }

  // Camera scan effect
  useEffect(() => {
    if (!scanning) return;

    let alive = true;
    const reader = new BrowserMultiFormatReader();

    hasResultRef.current = false;
    setError(null);
    setProduct(null);
    setScanTip("Hold steady and center the barcode in the box.");

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

              setScanTip(null);
              stopCamera();
              await lookupProduct(text);
              return;
            }

            if (err) {
              const name = (err as any)?.name;

              // normal scanning noise: NOT_FOUND is expected while camera hunts
              if (name === "NotFoundException") {
                // show tip occasionally, but do NOT throw a red error
                setTipThrottled("Try brighter light and move closer to the barcode.");
                return;
              }

              // benign stop/shutdown errors (don’t show)
              if (
                name === "AbortError" ||
                name === "NotAllowedError" ||
                name === "NotReadableError" ||
                name === "NotFoundError"
              ) {
                return;
              }

              // only show a soft tip for most camera issues
              setTipThrottled("Having trouble reading. Reduce glare and keep the code flat.");
            }
          }
        );
      } catch {
        setError("Camera access denied. Please allow permission and try again.");
        setScanTip(null);
        stopCamera();
      }
    })();

    return () => {
      alive = false;
      setScanTip(null);
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
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Scan</p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setError(null);
                  setProduct(null);
                  setScanTip(null);
                  stopCamera();
                  inputRef.current?.focus();
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Handheld / Type
              </button>

              <button
                onClick={() => {
                  setError(null);
                  setProduct(null);
                  setScanTip(null);
                  setScanning((s) => !s);
                  if (scanning) stopCamera();
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {scanning ? "Stop camera" : "Camera scan"}
              </button>
            </div>
          </div>

          {/* Handheld input */}
          <div className="mt-4">
            <label className="text-sm font-medium">Handheld scanner (Zebra) or type barcode</label>
            <input
              ref={inputRef}
              value={handheldValue}
              onChange={async (e) => {
                const v = e.target.value;
                setHandheldValue(v);

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
              Supported: UPC-A / EAN-13 / EAN-14 (handheld may send 11–14 digits)
            </p>
          </div>

          {/* Camera area — no page-jumping errors */}
          {scanning ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <div className="border-b border-slate-200 bg-white px-3 py-2">
                <p className="text-xs font-semibold text-slate-900">Camera scanning…</p>
                {scanTip ? <p className="mt-1 text-xs text-slate-500">{scanTip}</p> : null}
              </div>
              <video ref={videoRef} className="h-[320px] w-full object-cover" muted playsInline />
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
              Camera is off. Tap <span className="font-semibold">Camera scan</span> to start.
            </div>
          )}

          {/* Thaw date + last scan */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Thawed date</label>
              <input
                type="date"
                value={thawDateStr}
                onChange={(e) => setThawDateStr(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 h-12 text-[16px] leading-none outline-none focus:ring-2 focus:ring-slate-300"
                style={{ WebkitAppearance: "none" }}
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

        {/* RIGHT */}
        <div className="space-y-4">
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
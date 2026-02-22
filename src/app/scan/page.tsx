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

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<any>(null);
  const hasResultRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState<string>("");
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [thawDateStr, setThawDateStr] = useState(() => toDateInputValue(new Date()));
  const thawDate = useMemo(() => new Date(thawDateStr + "T00:00:00"), [thawDateStr]);

  async function lookupProduct(scannedBarcode: string) {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(scannedBarcode)}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        setProduct(null);
        setError("Product not found. Request this item to be added.");
        return;
      }

      const data = (await res.json()) as ProductDTO;
      setProduct(data);
      setError(null);
    } catch {
      setProduct(null);
      setError("Network error while looking up product.");
    }
  }

  function stopCamera() {
    try {
      controlsRef.current?.stop();
    } catch {}
    controlsRef.current = null;
    setScanning(false);
  }

  useEffect(() => {
    if (!scanning) return;

    let alive = true;
    const reader = new BrowserMultiFormatReader();

    // reset scan session state
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

            // If we already got a successful scan, ignore all further callbacks.
            if (hasResultRef.current) return;

            if (result) {
              hasResultRef.current = true;

              const text = result.getText().trim();
              setBarcode(text);

              // Stop camera FIRST to prevent extra callback noise
              stopCamera();

              // Then lookup
              await lookupProduct(text);
              return;
            }

            if (err) {
              const name = (err as any)?.name;

              // Normal "no barcode in this frame" noise
              if (name === "NotFoundException") return;

              // Benign stream/camera stop noise (often happens when stopping)
              if (
                name === "AbortError" ||
                name === "NotAllowedError" ||
                name === "NotReadableError" ||
                name === "NotFoundError"
              ) {
                return;
              }

              // Only show errors if still scanning and no result yet
              if (!hasResultRef.current) {
                setError("Camera scan error. Try better lighting and hold steady.");
              }
            }
          }
        );
      } catch {
        setError("Camera access denied. Please allow permission and try again.");
        stopCamera();
      }
    })();

    return () => {
      alive = false;
      stopCamera();
      try {
        // Some versions expose extra cleanup
        (reader as any)?.reset?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <Shell
      title="Scan frozen item"
      subtitle="Scan the barcode to display shelf life and the date to write on the gun."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Camera</p>
            <button
              onClick={() => {
                setError(null);
                setProduct(null);
                setScanning((s) => !s);
                // If turning off, stop camera immediately
                if (scanning) stopCamera();
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {scanning ? "Stop" : "Start scan"}
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <video ref={videoRef} className="h-[320px] w-full object-cover" muted playsInline />
          </div>

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
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
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState<string>("");
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [thawDateStr, setThawDateStr] = useState(() => toDateInputValue(new Date()));
  const thawDate = useMemo(() => new Date(thawDateStr + "T00:00:00"), [thawDateStr]);

  useEffect(() => {
    if (!scanning) return;

    let reader = new BrowserMultiFormatReader();
    let active = true;

    let controls: any;

    async function start() {
      const reader = new BrowserMultiFormatReader();

      try {
        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          async (result, err) => {
            if (result) {
              const barcode = result.getText();
              setBarcode(barcode);
              setScanning(false);

              // ✅ Proper way to stop camera
              controls?.stop();

              // fetch product here...
            }

            if (err) {
              const name = (err as any)?.name;
              if (name === "NotFoundException") return;
              setError("Camera scan error.");
            }
          }
        );
      } catch {
        setError("Camera access denied.");
      }
    }
    start();

    return () => {
      controls?.stop();
    };
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
              onClick={() => setScanning((s) => !s)}
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
                Store policy: thaw day counts as Day 1.
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
                  href="/request"
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

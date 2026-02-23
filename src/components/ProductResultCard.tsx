import type { Product } from "@prisma/client";
import { computeWriteDate, formatGunDate, startOfDayLocal } from "@/lib/dates";
import { useEffect, useMemo, useState } from "react";

const THAW_BUFFER_KEY = "thawBufferDays";

function pillClass(active: boolean) {
  return [
    "rounded-xl px-3 py-2 text-xs font-semibold border transition",
    active
      ? "bg-slate-900 text-white border-slate-900"
      : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50",
  ].join(" ");
}

export default function ProductResultCard({
  product,
  thawDate,
}: {
  product: Pick<Product, "barcode" | "name" | "shelfLifeDays" | "notes" | "updatedAt">;
  thawDate: Date;
}) {
  const thaw = startOfDayLocal(thawDate);

  // session-persisted thaw buffer (0/1/2)
  const [thawBufferDays, setThawBufferDays] = useState<number>(1);

  // Load once
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(THAW_BUFFER_KEY);
      if (raw !== null) {
        const n = Number(raw);
        if (Number.isFinite(n) && (n === 0 || n === 1 || n === 2)) {
          setThawBufferDays(n);
        }
      }
    } catch {}
  }, []);

  // Persist whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(THAW_BUFFER_KEY, String(thawBufferDays));
    } catch {}
  }, [thawBufferDays]);

  const writeDate = useMemo(() => {
    return computeWriteDate(thaw, product.shelfLifeDays, thawBufferDays);
  }, [thaw, product.shelfLifeDays, thawBufferDays]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Frozen bakery • Barcode {product.barcode}
      </p>
      <h2 className="mt-1 text-xl font-semibold">{product.name}</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Shelf life</p>
          <p className="mt-1 text-lg font-semibold">
            {product.shelfLifeDays} day{product.shelfLifeDays === 1 ? "" : "s"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Thawed date</p>
          <p className="mt-1 text-lg font-semibold">{formatGunDate(thaw)}</p>
        </div>

        <div className="rounded-xl bg-slate-900 p-3 text-white">
          <p className="text-xs font-semibold opacity-80">INPUT ON GUN</p>
          <p className="mt-1 text-lg font-semibold">{formatGunDate(writeDate)}</p>
        </div>
      </div>

      {/* Thaw buffer pills */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-900">Thaw buffer</p>
            <p className="mt-1 text-xs text-slate-500">
              Saved for this session
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className={pillClass(thawBufferDays === 0)}
              onClick={() => setThawBufferDays(0)}
            >
              None
            </button>
            <button
              type="button"
              className={pillClass(thawBufferDays === 1)}
              onClick={() => setThawBufferDays(1)}
            >
              1 day
            </button>
            <button
              type="button"
              className={pillClass(thawBufferDays === 2)}
              onClick={() => setThawBufferDays(2)}
            >
              2 days
            </button>
          </div>
        </div>
        {/*
          <p className="mt-3 text-xs text-slate-600">
            Formula: <span className="font-mono">gunDate = thawDate + thawBuffer + shelfLifeDays</span>
          </p>
        */}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-medium text-slate-500">Notes</p>
        <p className="mt-1 text-sm text-slate-800">{product.notes ?? "No notes."}</p>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Last updated: {new Date(product.updatedAt).toLocaleString()}
      </p>
    </div>
  );
}
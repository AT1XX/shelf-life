"use client";

import { useMemo, useEffect, useState } from "react";
import { computeWriteDate, formatGunDate, startOfDayLocal } from "@/lib/dates";

const QUICK_DAYS = [5, 7, 10, 14, 18, 21, 25, 28];
const THAW_BUFFER_KEY = "thawBufferDays";

function pill(active: boolean) {
  return [
    "rounded-xl px-3 py-2 text-xs font-semibold border transition",
    active
      ? "bg-slate-900 text-white border-slate-900"
      : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50",
  ].join(" ");
}

export default function QuickDaysCard({ thawDate }: { thawDate: Date }) {
  const thaw = startOfDayLocal(thawDate);

  const [buffer, setBuffer] = useState<number>(1);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(THAW_BUFFER_KEY);
      if (raw) {
        const n = Number(raw);
        if ([0, 1, 2].includes(n)) setBuffer(n);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(THAW_BUFFER_KEY, String(buffer));
    } catch {}
  }, [buffer]);

  const results = useMemo(() => {
    return QUICK_DAYS.map((days) => ({
      days,
      date: computeWriteDate(thaw, days, buffer),
    }));
  }, [thaw, buffer]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Shelf-life results
        </p>
       
      </div>

      {/* buffer selector */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Thaw buffer</p>
          <p className="text-xs text-slate-500">Saved for this session</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className={pill(buffer === 0)}
            onClick={() => setBuffer(0)}
          >
            None
          </button>

          <button
            type="button"
            className={pill(buffer === 1)}
            onClick={() => setBuffer(1)}
          >
            1 day
          </button>

          <button
            type="button"
            className={pill(buffer === 2)}
            onClick={() => setBuffer(2)}
          >
            2 days
          </button>
        </div>
      </div>
      
      {/* grid results */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {results.map((r) => (
          <div
            key={r.days}
            className="rounded-xl bg-slate-50 p-3 text-center"
          >
            <p className="text-xs text-slate-500">
              {r.days} days
            </p>

            <p className="text-lg font-semibold mt-1">
              {formatGunDate(r.date)}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Formula: thaw + buffer + shelf life
      </p>
    </div>
  );
}
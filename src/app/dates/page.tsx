"use client";

import { useMemo, useState } from "react";
import Shell from "@/components/Shell";
import QuickDaysCard from "@/components/QuickDaysCard";

function toDateInputValue(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

export default function DatesPage() {
  const [thawDateStr, setThawDateStr] = useState(() => toDateInputValue(new Date()));
  const thawDate = useMemo(() => new Date(thawDateStr + "T00:00:00"), [thawDateStr]);

  return (
    <Shell title="Quick Dates" subtitle="Common shelf life values.">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Thaw date</p>
          </div>

          <input
            type="date"
            value={thawDateStr}
            onChange={(e) => setThawDateStr(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 h-11 text-[16px] outline-none focus:ring-2 focus:ring-slate-300"
            style={{ WebkitAppearance: "none" }}
          />
        </div>
      </div>

      <div className="mt-4">
        <QuickDaysCard thawDate={thawDate} />
      </div>
    </Shell>
  );
}
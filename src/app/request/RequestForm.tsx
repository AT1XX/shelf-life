"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Shell from "@/components/Shell";

export default function RequestFormClient() {
  const searchParams = useSearchParams();
  const barcodeFromUrl = (searchParams.get("barcode") ?? "").trim();

  const [form, setForm] = useState({
    barcode: "",
    name: "",
    shelfLifeDays: 2,
    notes: "",
    submittedBy: "",
  });

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (barcodeFromUrl) {
      setForm((prev) => ({ ...prev, barcode: barcodeFromUrl }));
    }
  }, [barcodeFromUrl]);

  async function submit() {
    setOk(null);
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: form.barcode.trim(),
          name: form.name.trim(),
          shelfLifeDays: Number(form.shelfLifeDays),
          notes: form.notes.trim() || undefined,
          submittedBy: form.submittedBy.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(data?.message ?? "Request submission failed.");
        return;
      }

      setOk("Request submitted. A manager will review it.");
      setForm((prev) => ({ ...prev, barcode: "", name: "", shelfLifeDays: 2, notes: "" }));
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell
      title="Request a new frozen item"
      subtitle="If a barcode is not found, submit it here so a manager can approve and add the shelf-life days."
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Barcode (UPC/EAN)</label>
            <input
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="e.g., 0623461234567"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Product name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="e.g., Frozen Chocolate Croissant 4-Pack"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Shelf life (days)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={form.shelfLifeDays}
              onChange={(e) => setForm({ ...form, shelfLifeDays: Number(e.target.value) })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
            <p className="mt-2 text-xs text-slate-500">Thaw + 1 full day, then shelf life starts.</p>
          </div>

          <div>
            <label className="text-sm font-medium">Your name (or employee ID)</label>
            <input
              value={form.submittedBy}
              onChange={(e) => setForm({ ...form, submittedBy: e.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="e.g., Abel (Bakery)"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              rows={3}
              placeholder="e.g., Do not refreeze once thawed. Keep covered."
            />
          </div>
        </div>

        {ok && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {ok}
          </div>
        )}
        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {err}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </Shell>
  );
}
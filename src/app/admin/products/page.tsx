"use client";

import { useMemo, useState } from "react";
import Shell from "@/components/Shell";

export default function AdminProductsPage() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<{ row: number; message: string }[]>([]);

  const canAct = useMemo(() => token.trim().length > 0, [token]);

  async function exportCsv() {
    setError(null);
    setMessage(null);
    setWarnings([]);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/products/export", {
        headers: { "x-admin-token": token },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message ?? data?.error ?? "Export failed. Invalid token?");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "frozen-products.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage("Export complete: frozen-products.csv downloaded.");
    } catch {
      setError("Export failed due to a network error.");
    } finally {
      setBusy(false);
    }
  }

  async function importCsv() {
    setError(null);
    setMessage(null);
    setWarnings([]);
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "x-admin-token": token },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? data?.error ?? "Import failed.");
        if (data?.errors) setWarnings(data.errors);
        return;
      }
      setMessage(`Import complete: ${data.upserted ?? 0} item(s) upserted.`);
      setWarnings(data.warnings ?? []);
    } catch {
      setError("Import failed due to a network error.");
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const csv = [
      "barcode,name,shelfLifeDays,notes,isActive",
      "0623461234567,Butter Croissant 4-Pack,2,Best for same/next day,true",
      "0623467654321,Sourdough Loaf (Frozen),3,,true",
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Shell
      title="Products CSV import/export"
      subtitle="Bulk load frozen SKU shelf-life days or export your current list. Requires manager token."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-sm font-medium">Admin token</label>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Paste ADMIN_TOKEN"
          />
          <p className="mt-2 text-xs text-slate-500">
            Actions on this page send <span className="font-mono">x-admin-token</span>. Replace with SSO later.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={exportCsv}
              disabled={!canAct || busy}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? "Working…" : "Export CSV"}
            </button>

            <button
              onClick={downloadTemplate}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Download template
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Import products</p>
              <p className="mt-1 text-xs text-slate-500">
                CSV headers: <span className="font-mono">barcode,name,shelfLifeDays,notes,isActive</span>
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <button
              onClick={importCsv}
              disabled={!canAct || busy || !file}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {busy ? "Working…" : "Import CSV"}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Import is <span className="font-semibold">upsert</span> by barcode: existing items update (version bumps), new items insert.
          </p>

          {message && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Warnings</p>
              <p className="mt-1 text-xs text-amber-800">
                Some rows were skipped. Row numbers refer to the CSV line number.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-900">
                {warnings.slice(0, 20).map((w, idx) => (
                  <li key={idx}>Row {w.row}: {w.message}</li>
                ))}
              </ul>
              {warnings.length > 20 ? (
                <p className="mt-2 text-xs text-amber-800">…and {warnings.length - 20} more</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

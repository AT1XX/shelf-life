"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Shell from "@/components/Shell";
import { BrowserMultiFormatReader } from "@zxing/browser";

type ProductPick = {
  id: string;
  name: string;
  barcode: string | null;
  shelfLifeDays: number;
};

function looksLikeBarcode(v: string) {
  return /^\d{12,14}$/.test(v.trim()); // UPC-A/EAN-13/EAN-14
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      // @ts-ignore
      navigator.vibrate(pattern);
    } catch {}
  }
}

export default function AdminProductsPage() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<{ row: number; message: string }[]>([]);
  const canAct = useMemo(() => token.trim().length > 0, [token]);

  // --- Barcode linking UI state ---
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProductPick[]>([]);
  const [selected, setSelected] = useState<ProductPick | null>(null);

  const [barcodeInput, setBarcodeInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<any>(null);
  const hasResultRef = useRef(false);
  const [cameraOn, setCameraOn] = useState(false);

  // Search products (simple debounce)
  useEffect(() => {
    if (!canAct) return;
    const t = setTimeout(async () => {
      const query = q.trim();
      if (!query) {
        setResults([]);
        return;
      }
      try {
        const res = await fetch(`/api/admin/products/search?q=${encodeURIComponent(query)}`, {
          headers: { "x-admin-token": token },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setResults(data.items ?? []);
      } catch {}
    }, 250);

    return () => clearTimeout(t);
  }, [q, token, canAct]);

  function stopCamera() {
    try {
      controlsRef.current?.stop();
    } catch {}
    controlsRef.current = null;
    setCameraOn(false);
  }

  async function assignBarcode(codeRaw: string) {
    const code = codeRaw.trim();
    if (!selected) {
      setError("Select a product first.");
      vibrate([40, 60, 40]);
      return;
    }
    if (!code) return;

    setError(null);
    setMessage(null);
    setBusy(true);

    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(selected.id)}/assign-barcode`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ barcode: code }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message ?? "Failed to assign barcode.");
        vibrate([60, 80, 60]);
        return;
      }

      setMessage(`Linked barcode ${code} → ${selected.name}`);
      vibrate(60);

      // Update selected + results in UI
      setSelected((prev) => (prev ? { ...prev, barcode: code } : prev));
      setResults((prev) => prev.map((p) => (p.id === selected.id ? { ...p, barcode: code } : p)));

      setBarcodeInput("");
      inputRef.current?.focus();
    } catch {
      setError("Network error while assigning barcode.");
      vibrate([60, 80, 60]);
    } finally {
      setBusy(false);
    }
  }

  // Camera scanning for admin linking
  useEffect(() => {
    if (!cameraOn) return;

    let alive = true;
    const reader = new BrowserMultiFormatReader();
    hasResultRef.current = false;
    setError(null);

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
              const code = result.getText().trim();

              // feedback
              vibrate(40);

              stopCamera();
              await assignBarcode(code);
              return;
            }

            if (err) {
              const name = (err as any)?.name;
              if (name === "NotFoundException") return;

              // benign stop errors
              if (
                name === "AbortError" ||
                name === "NotAllowedError" ||
                name === "NotReadableError" ||
                name === "NotFoundError"
              ) {
                return;
              }

              setError("Camera scan error. Try better lighting / focus.");
            }
          }
        );
      } catch {
        setError("Camera access denied.");
        stopCamera();
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
  }, [cameraOn]);

  // --- Your existing CSV functions (unchanged) ---
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
      vibrate(30);
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
        vibrate([60, 80, 60]);
        return;
      }
      setMessage(`Import complete: ${data.upserted ?? 0} item(s) upserted.`);
      setWarnings(data.warnings ?? []);
      vibrate(40);
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
      subtitle="Bulk load frozen SKU shelf-life days, export your list, or link barcodes to products. Requires manager token."
    >
      <div className="space-y-6">
        {/* Token */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-sm font-medium">Admin token</label>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Paste ADMIN_TOKEN"
          />
          <p className="mt-2 text-xs text-slate-500">
            Actions on this page send <span className="font-mono">admintoken</span>. Will be replaced with SSO later.
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

        {/* Link barcode panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <p className="text-sm font-semibold">Link barcode to product</p>
            <p className="mt-1 text-xs text-slate-500">
              Search a product, select it, then scan with Zebra (handheld) or camera to assign its barcode.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="text-sm font-medium">Search product name</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                disabled={!canAct}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
                placeholder="e.g., Baxter Loaf Cakes"
              />

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="max-h-64 overflow-auto">
                  {results.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500">No results yet.</div>
                  ) : (
                    results.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelected(p);
                          setMessage(null);
                          setError(null);
                          setBarcodeInput("");
                          inputRef.current?.focus();
                          vibrate(20);
                        }}
                        className={`w-full text-left px-3 py-2 border-b last:border-b-0 text-sm hover:bg-slate-50 ${
                          selected?.id === p.id ? "bg-slate-50" : "bg-white"
                        }`}
                      >
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500">
                          Shelf: {p.shelfLifeDays} days • Barcode:{" "}
                          <span className="font-mono">{p.barcode ?? "—"}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {selected ? (
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="text-xs text-slate-500">Selected</div>
                  <div className="font-semibold">{selected.name}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Current barcode: <span className="font-mono">{selected.barcode ?? "—"}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                  Select a product to link a barcode.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Scan barcode (Zebra) or type</label>
              <input
                ref={inputRef}
                value={barcodeInput}
                onChange={async (e) => {
                  const v = e.target.value;
                  setBarcodeInput(v);
                  const t = v.trim();
                  if (looksLikeBarcode(t)) {
                    vibrate(30);
                    await assignBarcode(t);
                  }
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    vibrate(30);
                    await assignBarcode(barcodeInput);
                  }
                }}
                disabled={!canAct || busy}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
                placeholder="Focus here, then scan with Zebra"
                inputMode="numeric"
                autoComplete="off"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setError(null);
                    setMessage(null);
                    setCameraOn((s) => !s);
                    if (cameraOn) stopCamera();
                  }}
                  disabled={!canAct || busy}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {cameraOn ? "Stop camera" : "Camera scan"}
                </button>

                <button
                  onClick={() => {
                    stopCamera();
                    setBarcodeInput("");
                    inputRef.current?.focus();
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Focus handheld
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <video ref={videoRef} className="h-[240px] w-full object-cover" muted playsInline />
              </div>

              <p className="text-xs text-slate-500">
                Mobile feedback: your phone will vibrate when it captures a barcode and again when it saves.
              </p>
            </div>
          </div>

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Import */}
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

          {warnings.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Warnings</p>
              <p className="mt-1 text-xs text-amber-800">
                Some rows were skipped. Row numbers refer to the CSV line number.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-900">
                {warnings.slice(0, 20).map((w, idx) => (
                  <li key={idx}>
                    Row {w.row}: {w.message}
                  </li>
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
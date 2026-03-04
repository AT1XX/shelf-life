"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";

function getToken() {
  try {
    return (sessionStorage.getItem("adminToken") ?? "").trim();
  } catch {
    return "";
  }
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    setSaved(t);
  }, []);

  function unlock() {
    const t = token.trim();
    if (!t) {
      setError("Enter admin token.");
      return;
    }
    sessionStorage.setItem("adminToken", t);
    window.dispatchEvent(new Event("admin-token-updated"));
    setSaved(t);
    setToken("");
    setError(null);
  }

  function logout() {
    sessionStorage.removeItem("adminToken");
    window.dispatchEvent(new Event("admin-token-updated"));
    setSaved("");
    setError(null);
  }

  const unlocked = saved.length > 0;

  return (
    <Shell
      title="Admin"
      subtitle="Manager portal for approvals, product maintenance, and audit history."
    >
      {!unlocked ? (
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="text-sm font-medium">Admin token</label>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="ADMIN_TOKEN"
          />

          {error ? (
            <div className="mt-3 text-sm text-red-600">{error}</div>
          ) : null}

          <button
            onClick={unlock}
            className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Login
          </button>

          <p className="mt-3 text-xs text-slate-500">
            Token is stored for this browser session until you log off.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Admin unlocked</p>
                <p className="mt-1 text-xs text-slate-500">
                  You can access manager tools until you log off.
                </p>
              </div>
              <button
                onClick={logout}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Log off
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/admin/approvals"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
            >
              <p className="text-sm font-semibold">Approvals</p>
              <p className="mt-1 text-xs text-slate-500">
                Review & approve new item requests
              </p>
            </Link>

            <Link
              href="/admin/products"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
            >
              <p className="text-sm font-semibold">Products</p>
              <p className="mt-1 text-xs text-slate-500">
                Import/export CSV & manage SKUs
              </p>
            </Link>

            <Link
              href="/admin/audit"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
            >
              <p className="text-sm font-semibold">Audit log</p>
              <p className="mt-1 text-xs text-slate-500">
                View recent admin actions and imports
              </p>
            </Link>
          </div>
        </div>
      )}
    </Shell>
  );
}
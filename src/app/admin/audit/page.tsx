"use client";

import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import AdminGate from "@/components/AdminGate";

type AuditLogDTO = {
  id?: string;
  action: string;
  actor: string;
  entity: string;
  entityId: string;
  meta?: any;
  createdAt: string;
};

function prettyJson(v: any) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export default function AdminAuditPage() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);

  const canLoad = useMemo(() => token.trim().length > 0, [token]);

  useEffect(() => {
    try {
      const t = sessionStorage.getItem("adminToken") ?? "";
      setToken(t);
    } catch {}
  }, []);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/audit?take=100", {
        headers: { "x-admin-token": token },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? data?.error ?? "Failed to load audit logs.");
        setLogs([]);
        return;
      }
      setLogs(data.logs ?? []);
    } catch {
      setError("Network error while loading audit logs.");
      setLogs([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (canLoad) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad]);

  return (
    <AdminGate>
    <Shell
      title="Audit log"
      subtitle="Manager-only history of imports, approvals, and product updates."
    >
      <div className="space-y-4">
        {!canLoad ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold">Manager access required</p>
            <p className="mt-1 text-xs text-slate-500">
              Enter the admin token to view audit logs.
            </p>

            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="ADMIN_TOKEN"
            />

            <div className="mt-3 flex gap-2">
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                onClick={() => {
                  const t = token.trim();
                  if (!t) return;
                  sessionStorage.setItem("adminToken", t);
                  setToken(t);
                }}
              >
                Unlock
              </button>

              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                onClick={() => {
                  sessionStorage.removeItem("adminToken");
                  setToken("");
                }}
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Recent activity</p>
                <p className="mt-1 text-xs text-slate-500">
                  Showing the latest {Math.min(logs.length, 100)} events.
                </p>
              </div>
              <button
                onClick={load}
                disabled={busy}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {busy ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {logs.length === 0 && !error ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-600">
                  No audit logs yet.
                </div>
              ) : null}

              {logs.map((l, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {l.action}
                      <span className="ml-2 text-xs font-medium text-slate-500">
                        ({l.entity}:{l.entityId})
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(l.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <p className="mt-1 text-xs text-slate-600">
                    Actor: <span className="font-mono">{l.actor}</span>
                  </p>

                  {l.meta ? (
                    <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-800">
{prettyJson(l.meta)}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
    </AdminGate>
  );
}
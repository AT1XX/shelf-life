"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";

type Req = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  barcode: string;
  name: string;
  shelfLifeDays: number;
  notes?: string | null;
  submittedBy: string;
  submittedAt: string;
};

export default function ApprovalsPage() {
  const [token, setToken] = useState("");
  const [managerName, setManagerName] = useState("Manager");
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<Req[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/requests?status=PENDING", {
        headers: { "x-admin-token": token },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? data?.error ?? "Forbidden / invalid token");
        setRequests([]);
        return;
      }
      setRequests(data.results ?? []);
    } catch {
      setError("Could not load approvals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // don't auto-load without token
  }, []);

  async function decide(id: string, decision: "APPROVE" | "REJECT") {
    const managerComment =
      decision === "REJECT" ? prompt("Optional reason for rejection:") ?? "" : "";

    const res = await fetch(`/api/admin/requests/${id}/decision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify({ decision, decisionBy: managerName, managerComment }),
    });

    if (res.ok) {
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data?.message ?? "Decision failed. Check token and try again.");
    }
  }

  return (
    <Shell
      title="Manager approvals"
      subtitle="Approve pending frozen items to add them to barcode scan/search."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Admin token</label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Paste ADMIN_TOKEN"
              />
              <p className="mt-2 text-xs text-slate-500">
                This internal tool uses <span className="font-mono">admintoken</span> for manager actions.
                Will be replaced with SSO later.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Manager name</label>
              <input
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={load}
              disabled={!token || loading}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Loading…" : "Load pending"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Pending requests</p>
            <p className="text-xs text-slate-500">{requests.length} item(s)</p>
          </div>

          {requests.length === 0 ? (
            <p className="py-6 text-sm text-slate-500">No pending requests loaded.</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {requests.map((r) => (
                <div key={r.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{r.name}</p>
                      <p className="text-xs text-slate-500">
                        Barcode {r.barcode} • Shelf life {r.shelfLifeDays} day(s)
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        {r.notes ?? "No notes provided."}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Submitted by {r.submittedBy} • {new Date(r.submittedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => decide(r.id, "REJECT")}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => decide(r.id, "APPROVE")}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

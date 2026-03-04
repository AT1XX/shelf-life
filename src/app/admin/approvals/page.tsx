"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import AdminGate from "@/components/AdminGate";

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

type Flash = { type: "success" | "info" | "error"; message: string } | null;

export default function ApprovalsPage() {
  const [token, setToken] = useState("");
  const [managerName, setManagerName] = useState("Manager");
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<Req[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash>(null);

  function getToken() {
    try {
      return (sessionStorage.getItem("adminToken") ?? "").trim();
    } catch {
      return "";
    }
  }

  async function load(t: string) {
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/requests?status=PENDING", {
        headers: { "x-admin-token": t },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? data?.error ?? "Unauthorized. Invalid token.");
        setRequests([]);
        return;
      }
      setRequests(data.results ?? []);
    } catch {
      setError("Unable to load pending requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Sync token + auto-load
  useEffect(() => {
    async function syncAndLoad() {
      const t = getToken();
      setToken(t);

      if (t) {
        await load(t);
      } else {
        setRequests([]);
      }
    }

    syncAndLoad();
    window.addEventListener("admin-token-updated", syncAndLoad);
    window.addEventListener("storage", syncAndLoad);

    return () => {
      window.removeEventListener("admin-token-updated", syncAndLoad);
      window.removeEventListener("storage", syncAndLoad);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss flash messages
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  async function decide(id: string, decision: "APPROVE" | "REJECT") {
    const t = getToken();
    if (!t) {
      setError("Manager session is locked. Go to Admin to unlock.");
      return;
    }

    setError(null);
    setFlash(null);

    const managerComment =
      decision === "REJECT" ? (prompt("Optional reason for rejection:") ?? "").trim() : "";

    try {
      const res = await fetch(`/api/admin/requests/${id}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": t,
        },
        body: JSON.stringify({
          decision,
          decisionBy: managerName.trim() || "Manager",
          managerComment,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message ?? "Action failed. Please verify access and retry.");
        return;
      }

      setFlash({
        type: decision === "APPROVE" ? "success" : "info",
        message:
          decision === "APPROVE"
            ? "Approved. Item has been added to Products and is now searchable/scannable."
            : "Rejected. Request has been closed.",
      });

      await load(t);
    } catch {
      setError("Network error while submitting decision. Please try again.");
    }
  }

  return (
    <Shell
      title="Manager approvals"
      subtitle="Review and action pending requests to add frozen items to scan/search."
    >
      <AdminGate>
        <div className="space-y-6">
          {/* Session + controls */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Manager session</p>
                <p className="mt-1 text-xs text-slate-500">
                  Actions are authorized via <span className="font-mono">x-admin-token</span>. Manage
                  access in{" "}
                  <Link href="/admin" className="font-semibold underline">
                    Admin
                  </Link>
                  .
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700">
                {token ? "UNLOCKED" : "LOCKED"}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Manager name</label>
                <input
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g., Abel (Bakery Manager)"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Recorded on approvals/rejections for auditability.
                </p>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => load(getToken())}
                  disabled={!token || loading}
                  className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {loading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Flash banner */}
          {flash && (
            <div
              className={[
                "rounded-xl border p-4 text-sm",
                flash.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : flash.type === "info"
                  ? "border-slate-200 bg-slate-50 text-slate-800"
                  : "border-red-200 bg-red-50 text-red-800",
              ].join(" ")}
            >
              <p className="font-semibold">
                {flash.type === "success" ? "Success" : flash.type === "info" ? "Update" : "Error"}
              </p>
              <p className="mt-1">{flash.message}</p>
            </div>
          )}

          {/* Requests list */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Pending requests</p>
              <p className="text-xs text-slate-500">{requests.length} item(s)</p>
            </div>

            {requests.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">
                {token ? "No pending requests." : "Unlock Admin to view pending requests."}
              </p>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {requests.map((r) => (
                  <div key={r.id} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{r.name}</p>
                        <p className="text-xs text-slate-500">
                          Barcode <span className="font-mono">{r.barcode}</span> • Shelf life{" "}
                          {r.shelfLifeDays} day(s)
                        </p>
                        <p className="mt-2 text-sm text-slate-700">
                          {r.notes ?? "No notes provided."}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Submitted by {r.submittedBy} •{" "}
                          {new Date(r.submittedAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => decide(r.id, "REJECT")}
                          disabled={loading}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => decide(r.id, "APPROVE")}
                          disabled={loading}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
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
      </AdminGate>
    </Shell>
  );
}
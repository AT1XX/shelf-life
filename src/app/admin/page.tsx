"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";

export default function AdminUnlockPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function unlock() {
    const t = token.trim();
    if (!t) {
      setError("Enter admin token.");
      return;
    }

    sessionStorage.setItem("adminToken", t);
    window.dispatchEvent(new Event("admin-token-updated"));
    router.push("/admin/products");
      }

  return (
    <Shell
      title="Manager Access"
      subtitle="Enter admin token to unlock Approvals, Products, and Audit Log."
    >
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="text-sm font-medium">Admin token</label>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="ADMIN_TOKEN"
        />

        {error && (
          <div className="mt-3 text-sm text-red-600">{error}</div>
        )}

        <button
          onClick={unlock}
          className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Unlock Admin
        </button>
      </div>
    </Shell>
  );
}
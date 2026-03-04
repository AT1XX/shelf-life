"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    function sync() {
      try {
        const t = sessionStorage.getItem("adminToken") ?? "";
        setUnlocked(t.trim().length > 0);
      } catch {
        setUnlocked(false);
      } finally {
        setReady(true);
      }
    }

    sync();
    window.addEventListener("admin-token-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("admin-token-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Prevent hydration flicker
  if (!ready) return null;

  if (!unlocked) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold">Manager access required</p>
        <p className="mt-1 text-xs text-slate-500">
          This page is locked. Go to Admin to unlock with your manager token.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go to Admin
          </Link>
          <Link
            href="/scan"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Back to Scan
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
import { Suspense } from "react";
import RequestFormClient from "./RequestForm";

export default function RequestPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-600">Loading…</div>}>
      <RequestFormClient />
    </Suspense>
  );
}
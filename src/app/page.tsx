import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Frozen Bakery Shelf Life</h1>
        <p className="mt-2 text-sm text-slate-600">
          Scan a frozen bakery item to get the shelf life and the exact date to write on the gun.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800" href="/scan">
            Scan barcode
          </Link>
          <Link className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50" href="/search">
            Search product
          </Link>
          <Link className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50" href="/request">
            Request new item
          </Link>
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
          Manager approvals: <span className="font-mono">/admin/approvals</span> (requires <span className="font-mono">ADMIN_TOKEN</span>)
        </div>
      </div>
    </div>
  );
}

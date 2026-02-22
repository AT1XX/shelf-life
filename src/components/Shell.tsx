import Link from "next/link";

export default function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-sm font-semibold">Bakery SL</p>
            <p className="text-xs text-slate-500">Frozen thaw shelf-life lookup</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/scan">Scan</Link>
            <Link className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/search">Search</Link>
            <Link className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/request">Request</Link>
            <Link className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/admin/approvals">Approvals</Link>
            <Link className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/admin/products">Products</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {children}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-slate-500">
        Internal use only • Shelf-life values maintained by Bakery Management
      </footer>
    </div>
  );
}

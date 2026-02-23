"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={[
        "rounded-lg px-3 py-2 text-sm font-medium transition",
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export default function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!moreRef.current) return;
      if (!moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Bakery SL</p>
            <p className="text-xs text-slate-500">Frozen thaw shelf-life lookup</p>
          </div>

          {/* Desktop nav: show everything */}
          <nav className="hidden md:flex flex-wrap gap-2">
            <NavLink href="/scan">Scan</NavLink>
            <NavLink href="/search">Search</NavLink>
            <NavLink href="/request">Request</NavLink>
            <NavLink href="/admin/approvals">Approvals</NavLink>
            <NavLink href="/admin/products">Products</NavLink>
          </nav>

          {/* Mobile nav: show main links + More menu */}
          <nav className="flex md:hidden items-center gap-2">
            <NavLink href="/scan">Scan</NavLink>
            <NavLink href="/search">Search</NavLink>
           

            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((s) => !s)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                aria-haspopup="menu"
                aria-expanded={moreOpen}
              >
                More 
              </button>

              {moreOpen ? (
                <div
                  className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                  role="menu"
                >
                   <Link
                    href="/request"
                    onClick={() => setMoreOpen(false)}
                    className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                    role="menuitem"
                  >
                     Request
                  </Link>
                  <Link
                    href="/admin/approvals"
                    onClick={() => setMoreOpen(false)}
                    className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                    role="menuitem"
                  >
                    Approvals
                  </Link>
                  <Link
                    href="/admin/products"
                    onClick={() => setMoreOpen(false)}
                    className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                    role="menuitem"
                  >
                    Products
                  </Link>
                </div>
              ) : null}
            </div>
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
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function NavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        // iPhone-friendly: bigger tap target + 16px text avoids Safari zoom
        "rounded-xl px-3 h-11 inline-flex items-center justify-center text-[16px] font-semibold transition",
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
  const pathname = usePathname();

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  const [hasAdmin, setHasAdmin] = useState(false);

  useEffect(() => {
    function sync() {
      try {
        const t = sessionStorage.getItem("adminToken") ?? "";
        setHasAdmin(t.trim().length > 0);
      } catch {
        setHasAdmin(false);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!moreRef.current) return;
      if (!moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Close dropdown on route change (important on mobile)
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3">
          {/* Row 1: Brand */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Bakery SL</p>
              <p className="text-xs text-slate-500 leading-tight">
                Frozen thaw shelf-life lookup
              </p>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-2">
              <NavLink href="/scan">Scan</NavLink>
              <NavLink href="/search">Search</NavLink>
              <NavLink href="/request">Request</NavLink>
              <NavLink href="/admin">Admin</NavLink>
            </nav>
          </div>

          {/* Row 2: Mobile nav */}
          <div className="mt-3 flex md:hidden items-center gap-2">
            <div className="flex flex-1 items-center gap-2">
              <NavLink href="/scan">Scan</NavLink>
              <NavLink href="/search">Search</NavLink>
              <NavLink href="/request">Request</NavLink>
            </div>

            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((s) => !s)}
                className="h-11 rounded-xl px-3 text-[16px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
                aria-haspopup="menu"
                aria-expanded={moreOpen}
              >
                More
              </button>

              {moreOpen ? (
                <div
                  className="absolute right-0 z-50 mt-2 w-[min(92vw,18rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
                  role="menu"
                >
                  <Link
                    href="/admin"
                    onClick={() => setMoreOpen(false)}
                    className="block px-4 py-3 text-[16px] font-semibold text-slate-800 hover:bg-slate-50"
                    role="menuitem"
                  >
                    Admin
                  </Link>

                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-semibold leading-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600 leading-snug">{subtitle}</p>
          ) : null}
        </div>

        {children}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-slate-500">
        Internal use only • Shelf-life values maintained by Bakery Management
      </footer>
    </div>
  );
}
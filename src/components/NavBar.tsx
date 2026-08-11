"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/report", label: "Report" },
  { href: "/plans", label: "Plans" },
  { href: "/actuals", label: "Actuals" },
  { href: "/periods", label: "Periods" },
];

export default function NavBar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-3 md:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Logo & Mobile Sign out */}
          <div className="flex items-center justify-between md:justify-start">
            <Link href="/report" className="flex items-center gap-1.5 font-bold text-slate-900 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-all group-hover:bg-emerald-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
                  <path d="M3 3v18h18"/>
                  <path d="M18 17V9"/>
                  <path d="M13 17V5"/>
                  <path d="M8 17v-3"/>
                </svg>
              </div>
              <span className="tracking-tight text-lg">
                Plan<span className="text-emerald-600 font-semibold">vs</span>Actual
              </span>
            </Link>

            {/* Mobile Sign out button (hidden on desktop) */}
            <div className="flex items-center gap-3 md:hidden">
              <button className="btn-secondary py-1 px-3 text-xs" onClick={logout}>
                Sign out
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex justify-center gap-1 overflow-x-auto py-1 md:py-0">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === l.href
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop User Info & Sign out */}
          <div className="hidden md:flex items-center justify-end gap-3">
            <span className="text-sm text-slate-500">{email}</span>
            <button className="btn-secondary" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

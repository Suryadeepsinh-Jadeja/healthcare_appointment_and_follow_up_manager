"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "./ui";
import { useAuth } from "../lib/auth";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function initials(name?: string) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function PortalNav({ links }: { links: Array<{ href: string; label: string }> }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-3 px-6 py-3.5 sm:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark size="sm" />
          <span className="font-display text-lg font-semibold text-slate-900">Healthcare Manager</span>
        </Link>

        <nav className="flex flex-wrap justify-start gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50/80 p-1 sm:justify-self-center">
          {links.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cx(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                  active ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-start gap-3 sm:justify-end">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {initials(user?.name)}
          </span>
          <span className="hidden text-sm font-medium text-slate-700 sm:inline">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="rounded-full border border-transparent px-2.5 py-1 text-sm text-slate-500 transition hover:border-slate-200 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

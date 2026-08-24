"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LogOut, type LucideIcon, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "./ui";
import { RouteTransition } from "./motion";
import { useAuth } from "../lib/auth";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
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

function isActive(pathname: string | null, link: NavLink) {
  if (!pathname) return false;
  if (link.exact) return pathname === link.href;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

function NavList({
  links,
  pathname,
  onNavigate,
  layoutId,
}: {
  links: NavLink[];
  pathname: string | null;
  onNavigate?: () => void;
  layoutId: string;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = isActive(pathname, link);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cx(
              "relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              active ? "text-brand-700" : "text-slate-600 hover:text-slate-900",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-brand-50 ring-1 ring-inset ring-brand-100"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <Icon className="relative z-10 h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            <span className="relative z-10">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ links, children }: { links: NavLink[]; children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white/80 backdrop-blur md:flex">
        <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
          <BrandMark size="sm" />
          <span className="font-display text-lg font-semibold text-slate-900">Healthcare</span>
        </Link>

        <div className="flex-1 overflow-y-auto px-3">
          <NavList links={links} pathname={pathname} layoutId="desktop-active-nav" />
        </div>

        <div className="border-t border-slate-200/70 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {initials(user?.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark size="sm" />
          <span className="font-display text-base font-semibold text-slate-900">Healthcare</span>
        </Link>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-white p-4 shadow-2xl md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5" onClick={() => setDrawerOpen(false)}>
                  <BrandMark size="sm" />
                  <span className="font-display text-lg font-semibold text-slate-900">Healthcare</span>
                </Link>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <NavList
                links={links}
                pathname={pathname}
                onNavigate={() => setDrawerOpen(false)}
                layoutId="mobile-active-nav"
              />

              <div className="mt-auto border-t border-slate-200/70 pt-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                    {initials(user?.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
                    <p className="truncate text-xs text-slate-500">{user?.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    aria-label="Sign out"
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <RouteTransition>{children}</RouteTransition>
        </div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

export function PortalNav({ links }: { links: Array<{ href: string; label: string }> }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-5xl grid-cols-3 items-center px-6 py-4">
        <span className="text-xl font-semibold">Healthcare Manager</span>

        <nav className="flex justify-center gap-4 text-sm text-slate-600">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-slate-900">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-3 text-sm text-slate-600">
          <span>{user?.name}</span>
          <button onClick={handleLogout} className="text-slate-500 underline hover:text-slate-900">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

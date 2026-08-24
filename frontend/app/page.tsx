"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BrandMark, Button } from "../components/ui";
import { useAuth } from "../lib/auth";

const ROLE_HOME: Record<string, string> = {
  PATIENT: "/patient/doctors",
  DOCTOR: "/doctor/appointments",
  ADMIN: "/admin/doctors",
};

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(ROLE_HOME[user.role] ?? "/login");
    }
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <main className="hero-gradient flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading...
      </main>
    );
  }

  return (
    <main className="hero-gradient relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="relative w-full max-w-2xl rounded-[2rem] border border-white/60 bg-white/70 p-10 text-center shadow-xl shadow-brand-900/5 backdrop-blur-sm sm:p-14">
        <BrandMark size="lg" className="mx-auto" />
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Care that grows <span className="text-brand-600">with you</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-slate-600">
          Book appointments, get an AI pre-visit summary for your doctor, and stay on top of follow-ups and
          medication reminders.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login">
            <Button className="px-6 py-3 text-base">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button variant="secondary" className="px-6 py-3 text-base">
              Register as a patient
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

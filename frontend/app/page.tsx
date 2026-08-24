"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BrandMark, Button } from "../components/ui";
import { useAuth } from "../lib/auth";

const ROLE_HOME: Record<string, string> = {
  PATIENT: "/patient",
  DOCTOR: "/doctor",
  ADMIN: "/admin",
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
      <div aria-hidden className="blob blob-a -left-24 -top-24 h-96 w-96 bg-brand-300" />
      <div aria-hidden className="blob blob-b -right-20 top-1/3 h-80 w-80 bg-accent-300" />
      <div aria-hidden className="blob blob-a bottom-[-6rem] left-1/3 h-72 w-72 bg-brand-200" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-2xl rounded-[2rem] border border-white/60 bg-white/70 p-10 text-center shadow-xl shadow-brand-900/5 backdrop-blur-sm sm:p-14"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <BrandMark size="lg" className="mx-auto" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-6 font-display text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl"
        >
          Care that grows <span className="text-brand-600">with you</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mx-auto mt-4 max-w-lg text-slate-600"
        >
          Book appointments, get an AI pre-visit summary for your doctor, and stay on top of follow-ups and
          medication reminders.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="/login">
            <Button className="px-6 py-3 text-base">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button variant="secondary" className="px-6 py-3 text-base">
              Register as a patient
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}

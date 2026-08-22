"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "../components/ui";
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
    return <main className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading...</main>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold">Healthcare Appointment & Follow-up Manager</h1>
      <p className="max-w-xl text-slate-600">
        Book appointments, get an AI pre-visit summary for your doctor, and stay on top of follow-ups and
        medication reminders.
      </p>
      <div className="flex gap-3">
        <Link href="/login">
          <Button>Sign in</Button>
        </Link>
        <Link href="/register">
          <Button variant="secondary">Register as a patient</Button>
        </Link>
      </div>
    </main>
  );
}

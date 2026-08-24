"use client";

import { CalendarCheck, Clock, Settings as SettingsIcon, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card } from "../../components/ui";
import { Reveal, Stagger, StaggerItem } from "../../components/motion";
import { CardSkeleton } from "../../components/Skeleton";
import { apiGet } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Appointment } from "../../lib/types";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);

  useEffect(() => {
    apiGet<{ appointments: Appointment[] }>("/appointments/me")
      .then((data) => setAppointments(data.appointments))
      .catch(() => setAppointments([]));
  }, []);

  const next = useMemo(() => {
    if (!appointments) return null;
    return (
      appointments
        .filter(
          (a) => (a.status === "CONFIRMED" || a.status === "HELD") && new Date(a.slotStart).getTime() > Date.now(),
        )
        .sort((a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime())[0] ?? null
    );
  }, [appointments]);

  const completedCount = appointments?.filter((a) => a.status === "COMPLETED").length ?? 0;
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <Reveal>
        <h1 className="font-display text-2xl font-semibold text-slate-900 sm:text-3xl">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="mt-1 text-slate-600">Here's what's coming up.</p>
      </Reveal>

      {appointments === null ? (
        <CardSkeleton className="h-40" />
      ) : next ? (
        <Reveal delay={0.05}>
          <Card className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 text-white">
            <div aria-hidden className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative z-10">
              <p className="text-sm font-medium text-brand-100">Your next appointment</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">
                {next.doctor?.user.name} · {next.doctor?.specialisation}
              </h2>
              <p className="mt-2 flex items-center gap-1.5 text-brand-100">
                <Clock className="h-4 w-4" /> {formatWhen(next.slotStart)}
              </p>
              <div className="mt-4">
                <Badge>{next.status}</Badge>
              </div>
            </div>
          </Card>
        </Reveal>
      ) : (
        <Reveal delay={0.05}>
          <Card>
            <p className="text-slate-600">No upcoming appointments yet.</p>
            <Link href="/patient/doctors" className="mt-3 inline-block text-sm font-medium text-brand-700 underline">
              Find a doctor to get started
            </Link>
          </Card>
        </Reveal>
      )}

      <Stagger className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <Link href="/patient/doctors">
            <Card hover className="h-full">
              <Stethoscope className="h-5 w-5 text-brand-600" />
              <p className="mt-3 font-medium text-slate-900">Find a doctor</p>
              <p className="mt-1 text-sm text-slate-500">Search by specialisation and book a slot.</p>
            </Card>
          </Link>
        </StaggerItem>
        <StaggerItem>
          <Link href="/patient/appointments">
            <Card hover className="h-full">
              <CalendarCheck className="h-5 w-5 text-brand-600" />
              <p className="mt-3 font-medium text-slate-900">My appointments</p>
              <p className="mt-1 text-sm text-slate-500">{completedCount} completed so far.</p>
            </Card>
          </Link>
        </StaggerItem>
        <StaggerItem>
          <Link href="/settings">
            <Card hover className="h-full">
              <SettingsIcon className="h-5 w-5 text-brand-600" />
              <p className="mt-3 font-medium text-slate-900">Settings</p>
              <p className="mt-1 text-sm text-slate-500">Connect Google Calendar.</p>
            </Card>
          </Link>
        </StaggerItem>
      </Stagger>
    </div>
  );
}

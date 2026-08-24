"use client";

import { CalendarClock, ClipboardCheck, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "../../components/ui";
import { Reveal, Stagger, StaggerItem } from "../../components/motion";
import { StatCard } from "../../components/StatCard";
import { CardSkeleton } from "../../components/Skeleton";
import { apiGet } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Appointment } from "../../lib/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

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

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const [next, setNext] = useState<Appointment | null | undefined>(undefined);
  const [today, setToday] = useState<Appointment[] | null>(null);

  useEffect(() => {
    apiGet<{ appointment: Appointment | null }>("/doctor/appointments/next")
      .then((data) => setNext(data.appointment))
      .catch(() => setNext(null));
    apiGet<{ appointments: Appointment[] }>(`/doctor/appointments?date=${todayIso()}`)
      .then((data) => setToday(data.appointments))
      .catch(() => setToday([]));
  }, []);

  const firstName = user?.name?.replace(/^dr\.?\s+/i, "").split(" ")[0];
  const confirmedToday = today?.filter((a) => a.status === "CONFIRMED" || a.status === "COMPLETED").length ?? 0;

  return (
    <div className="space-y-8">
      <Reveal>
        <h1 className="font-display text-2xl font-semibold text-slate-900 sm:text-3xl">
          {firstName ? `Good to see you, Dr. ${firstName}` : "Dashboard"}
        </h1>
        <p className="mt-1 text-slate-600">Here's your day at a glance.</p>
      </Reveal>

      {next === undefined ? (
        <CardSkeleton className="h-40" />
      ) : next ? (
        <Reveal delay={0.05}>
          <Card className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 text-white">
            <div aria-hidden className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative z-10">
              <p className="text-sm font-medium text-brand-100">Next up</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{next.patient?.user.name}</h2>
              <p className="mt-2 flex items-center gap-1.5 text-brand-100">
                <Clock className="h-4 w-4" /> {formatWhen(next.slotStart)}
              </p>
              <Link
                href={`/doctor/appointments/${next.id}`}
                className="mt-4 inline-block rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25"
              >
                View appointment
              </Link>
            </div>
          </Card>
        </Reveal>
      ) : (
        <Reveal delay={0.05}>
          <Card>
            <p className="text-slate-600">No upcoming appointments.</p>
          </Card>
        </Reveal>
      )}

      <Stagger className="grid gap-4 sm:grid-cols-2">
        <StaggerItem>
          <StatCard label="Appointments today" value={today?.length ?? 0} icon={CalendarClock} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Confirmed / completed today" value={confirmedToday} icon={ClipboardCheck} accent="accent" />
        </StaggerItem>
      </Stagger>

      <Reveal delay={0.1}>
        <Link href="/doctor/appointments" className="text-sm font-medium text-brand-700 underline">
          View full schedule →
        </Link>
      </Reveal>
    </div>
  );
}

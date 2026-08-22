"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, ErrorText } from "../../../components/ui";
import { apiGet, ApiError } from "../../../lib/api";
import { Appointment } from "../../../lib/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatNextAppointment(appointment: Appointment): string {
  const when = new Date(appointment.slotStart).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `Next appointment: ${appointment.patient?.user.name} · ${when}`;
}

export default function DoctorAppointmentsPage() {
  const [date, setDate] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [loadingNext, setLoadingNext] = useState(true);

  useEffect(() => {
    setLoadingNext(true);
    apiGet<{ appointment: Appointment | null }>("/doctor/appointments/next")
      .then((data) => {
        setNextAppointment(data.appointment);
        setDate((current) => current || data.appointment?.slotStart.slice(0, 10) || todayIso());
      })
      .catch(() => {
        setNextAppointment(null);
        setDate((current) => current || todayIso());
      })
      .finally(() => setLoadingNext(false));
  }, []);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setError(null);
    apiGet<{ appointments: Appointment[] }>(`/doctor/appointments?date=${date}`)
      .then((data) => setAppointments(data.appointments))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load appointments."))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Appointments</h1>
        {!loadingNext && (
          <p className="mt-1 text-sm font-medium text-emerald-700">
            {nextAppointment ? formatNextAppointment(nextAppointment) : "No upcoming appointments"}
          </p>
        )}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <ErrorText>{error}</ErrorText>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : appointments.length === 0 ? (
        <p className="text-sm text-slate-500">No appointments on this date.</p>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <Link key={appointment.id} href={`/doctor/appointments/${appointment.id}`}>
              <Card className="transition hover:border-slate-400">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{appointment.patient?.user.name}</p>
                    <p className="text-sm text-slate-600">
                      {new Date(appointment.slotStart).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {appointment.preVisitSummary && !appointment.preVisitSummary.generationFailed && (
                      <Badge>{appointment.preVisitSummary.urgency}</Badge>
                    )}
                    <Badge>{appointment.status}</Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

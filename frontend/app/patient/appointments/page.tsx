"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, ErrorText } from "../../../components/ui";
import { apiDelete, apiGet, ApiError } from "../../../lib/api";
import { Appointment } from "../../../lib/types";
import { RescheduleForm } from "./RescheduleForm";

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiGet<{ appointments: Appointment[] }>("/appointments/me")
      .then((data) => setAppointments(data.appointments))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load appointments."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      await apiDelete(`/appointments/${id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel this appointment.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My appointments</h1>
      <ErrorText>{error}</ErrorText>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : appointments.length === 0 ? (
        <p className="text-sm text-slate-500">No appointments yet.</p>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <Card key={appointment.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    {appointment.doctor?.user.name} — {appointment.doctor?.specialisation}
                  </p>
                  <p className="text-sm text-slate-600">{new Date(appointment.slotStart).toUTCString()}</p>
                </div>
                <Badge>{appointment.status}</Badge>
              </div>

              {appointment.status === "CONFIRMED" && appointment.preVisitSummary && (
                <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                  {appointment.preVisitSummary.generationFailed ? (
                    <p className="text-amber-700">AI summary unavailable — raw symptoms on file.</p>
                  ) : (
                    <>
                      <p>
                        <strong>Urgency:</strong> <Badge>{appointment.preVisitSummary.urgency}</Badge>
                      </p>
                      <p className="mt-1">{appointment.preVisitSummary.chiefComplaint}</p>
                    </>
                  )}
                </div>
              )}

              {appointment.status === "COMPLETED" && appointment.postVisitSummary && (
                <div className="mt-3 rounded-md bg-blue-50 p-3 text-sm">
                  {appointment.postVisitSummary.generationFailed ? (
                    <p className="text-amber-700">AI summary unavailable — raw notes below.</p>
                  ) : (
                    <p>{appointment.postVisitSummary.summary}</p>
                  )}
                  {appointment.postVisitSummary.medicationSchedule.length > 0 && (
                    <ul className="mt-2 list-disc pl-5">
                      {appointment.postVisitSummary.medicationSchedule.map((med, i) => (
                        <li key={i}>
                          {med.drug} — {med.dose}, {med.timing}
                        </li>
                      ))}
                    </ul>
                  )}
                  {appointment.postVisitNotes && (
                    <p className="mt-2 text-xs text-slate-500">Doctor's notes: {appointment.postVisitNotes}</p>
                  )}
                </div>
              )}

              {(appointment.status === "HELD" || appointment.status === "CONFIRMED") && (
                <div className="mt-3 flex gap-3">
                  {appointment.status === "CONFIRMED" && (
                    <Button
                      variant="secondary"
                      disabled={reschedulingId === appointment.id}
                      onClick={() => setReschedulingId(reschedulingId === appointment.id ? null : appointment.id)}
                    >
                      {reschedulingId === appointment.id ? "Close" : "Reschedule"}
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    disabled={cancellingId === appointment.id}
                    onClick={() => handleCancel(appointment.id)}
                  >
                    {cancellingId === appointment.id ? "Cancelling..." : "Cancel"}
                  </Button>
                </div>
              )}

              {reschedulingId === appointment.id && (
                <RescheduleForm
                  appointment={appointment}
                  onDone={() => {
                    setReschedulingId(null);
                    load();
                  }}
                  onError={(message) => setError(message)}
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

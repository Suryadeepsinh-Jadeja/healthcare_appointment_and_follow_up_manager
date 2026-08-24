"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card, ErrorText, Input, Label, Textarea } from "../../../../components/ui";
import { Reveal } from "../../../../components/motion";
import { useToast } from "../../../../components/Toast";
import { apiGet, apiPost, ApiError } from "../../../../lib/api";
import { Appointment } from "../../../../lib/types";

interface PrescriptionRow {
  drug: string;
  dose: string;
  timesPerDay: number;
  days: number;
}

const EMPTY_ROW: PrescriptionRow = { drug: "", dose: "", timesPerDay: 1, days: 1 };

export default function DoctorAppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { push } = useToast();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<PrescriptionRow[]>([{ ...EMPTY_ROW }]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet<{ appointment: Appointment }>(`/doctor/appointments/${id}`)
      .then((data) => setAppointment(data.appointment))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load appointment."))
      .finally(() => setLoading(false));
  }, [id]);

  function updateRow(index: number, patch: Partial<PrescriptionRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const prescription = rows.filter((row) => row.drug.trim() && row.dose.trim());
      const data = await apiPost<{ appointment: Appointment }>(`/doctor/appointments/${id}/notes`, {
        notes,
        prescription,
      });
      setAppointment(data.appointment);
      push("Visit completed — summary sent to patient.");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Could not submit notes.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;
  if (error || !appointment) return <ErrorText>{error ?? "Appointment not found."}</ErrorText>;

  return (
    <Reveal className="max-w-2xl space-y-6">
      <Button variant="secondary" onClick={() => router.push("/doctor/appointments")}>
        Back to appointments
      </Button>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{appointment.patient?.user.name}</h1>
            <p className="text-sm text-slate-600">{new Date(appointment.slotStart).toUTCString()}</p>
          </div>
          <Badge>{appointment.status}</Badge>
        </div>

        {appointment.symptomForm && (
          <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
            <p className="font-medium">Reported symptoms</p>
            <p className="mt-1">{appointment.symptomForm.symptoms}</p>
          </div>
        )}

        {appointment.preVisitSummary && (
          <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
            {appointment.preVisitSummary.generationFailed ? (
              <p className="text-amber-700">AI summary unavailable — raw symptoms above.</p>
            ) : (
              <>
                <p>
                  <strong>Urgency:</strong> <Badge>{appointment.preVisitSummary.urgency}</Badge>
                </p>
                <p className="mt-1">{appointment.preVisitSummary.chiefComplaint}</p>
                <ul className="mt-2 list-disc pl-5">
                  {appointment.preVisitSummary.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Card>

      {appointment.status === "COMPLETED" ? (
        <Card>
          <h2 className="font-medium">Visit notes</h2>
          <p className="mt-2 text-sm text-slate-700">{appointment.postVisitNotes}</p>
          {appointment.postVisitSummary && (
            <div className="mt-3 rounded-md bg-blue-50 p-3 text-sm">
              {appointment.postVisitSummary.generationFailed ? (
                <p className="text-amber-700">AI patient summary unavailable.</p>
              ) : (
                <p>{appointment.postVisitSummary.summary}</p>
              )}
            </div>
          )}
        </Card>
      ) : appointment.status === "CONFIRMED" ? (
        <Card>
          <h2 className="font-medium">Submit visit notes</h2>
          <div className="mt-3">
            <Label htmlFor="notes">Clinical notes</Label>
            <Textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="mt-4">
            <Label>Prescription</Label>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-4 gap-2">
                  <Input
                    placeholder="Drug"
                    value={row.drug}
                    onChange={(e) => updateRow(i, { drug: e.target.value })}
                  />
                  <Input
                    placeholder="Dose (e.g. 500mg)"
                    value={row.dose}
                    onChange={(e) => updateRow(i, { dose: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder="Times/day"
                    value={row.timesPerDay}
                    onChange={(e) => updateRow(i, { timesPerDay: Number(e.target.value) })}
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder="Days"
                    value={row.days}
                    onChange={(e) => updateRow(i, { days: Number(e.target.value) })}
                  />
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              className="mt-2"
              type="button"
              onClick={() => setRows((prev) => [...prev, { ...EMPTY_ROW }])}
            >
              Add medication
            </Button>
          </div>

          <ErrorText>{submitError}</ErrorText>

          <Button className="mt-4" disabled={submitting || !notes.trim()} onClick={handleSubmit}>
            {submitting ? "Submitting..." : "Complete visit"}
          </Button>
        </Card>
      ) : null}
    </Reveal>
  );
}

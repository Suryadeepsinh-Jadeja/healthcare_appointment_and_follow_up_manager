"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button, Card, ErrorText, Input, Label } from "../../../../components/ui";
import {
  WorkingHoursEditor,
  WorkingHoursState,
  workingHoursPayloadToState,
  workingHoursStateToPayload,
} from "../../../../components/WorkingHoursEditor";
import { apiGet, apiPatch, apiPost, ApiError } from "../../../../lib/api";
import { Doctor } from "../../../../lib/types";

export default function AdminDoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  const [specialisation, setSpecialisation] = useState("");
  const [slotDurationMin, setSlotDurationMin] = useState(20);
  const [workingHours, setWorkingHours] = useState<WorkingHoursState>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveResult, setLeaveResult] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ doctors: Doctor[] }>("/doctors").then((data) => {
      const found = data.doctors.find((d) => d.id === id);
      if (found) {
        setDoctor(found);
        setSpecialisation(found.specialisation);
        setSlotDurationMin(found.slotDurationMin);
        setWorkingHours(workingHoursPayloadToState(found.workingHours ?? {}));
      }
      setLoading(false);
    });
  }, [id]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      await apiPatch(`/admin/doctors/${id}`, {
        specialisation,
        slotDurationMin,
        workingHours: workingHoursStateToPayload(workingHours),
      });
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddLeave(e: FormEvent) {
    e.preventDefault();
    setLeaveError(null);
    setLeaveResult(null);
    setLeaveSubmitting(true);
    try {
      const data = await apiPost<{ cancelledCount: number }>(`/admin/doctors/${id}/leave`, {
        date: leaveDate,
        reason: leaveReason || undefined,
      });
      setLeaveResult(
        data.cancelledCount > 0
          ? `Leave added. ${data.cancelledCount} affected appointment(s) were cancelled and patients notified.`
          : "Leave added.",
      );
      setLeaveDate("");
      setLeaveReason("");
    } catch (err) {
      setLeaveError(err instanceof ApiError ? err.message : "Could not add leave.");
    } finally {
      setLeaveSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;
  if (!doctor) return <ErrorText>Doctor not found.</ErrorText>;

  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="secondary" onClick={() => router.push("/admin/doctors")}>
        Back to doctors
      </Button>

      <Card>
        <h1 className="text-xl font-semibold">{doctor.name}</h1>
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="specialisation">Specialisation</Label>
              <Input
                id="specialisation"
                required
                value={specialisation}
                onChange={(e) => setSpecialisation(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="slotDuration">Slot duration (minutes)</Label>
              <Input
                id="slotDuration"
                type="number"
                min={5}
                required
                value={slotDurationMin}
                onChange={(e) => setSlotDurationMin(Number(e.target.value))}
              />
            </div>
          </div>
          <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} />
          <ErrorText>{saveError}</ErrorText>
          {saved && <p className="text-sm text-emerald-700">Saved.</p>}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-medium">Add a leave day</h2>
        <p className="mt-1 text-sm text-slate-600">
          Any confirmed or held appointments on this date will be cancelled and patients notified automatically.
        </p>
        <form onSubmit={handleAddLeave} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="leaveDate">Date</Label>
              <Input
                id="leaveDate"
                type="date"
                required
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="leaveReason">Reason (optional)</Label>
              <Input id="leaveReason" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} />
            </div>
          </div>
          <ErrorText>{leaveError}</ErrorText>
          {leaveResult && <p className="text-sm text-emerald-700">{leaveResult}</p>}
          <Button type="submit" disabled={leaveSubmitting}>
            {leaveSubmitting ? "Adding..." : "Add leave"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

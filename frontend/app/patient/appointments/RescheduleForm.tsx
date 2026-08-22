"use client";

import { useEffect, useState } from "react";
import { Button, ErrorText } from "../../../components/ui";
import { apiGet, apiPatch, ApiError } from "../../../lib/api";
import { Appointment, Slot } from "../../../lib/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

export function RescheduleForm({
  appointment,
  onDone,
  onError,
}: {
  appointment: Appointment;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submittingSlot, setSubmittingSlot] = useState<string | null>(null);

  useEffect(() => {
    setLoadingSlots(true);
    setSlotsError(null);
    apiGet<{ slots: Slot[] }>(`/doctors/${appointment.doctorId}/slots?date=${date}`)
      .then((data) => setSlots(data.slots))
      .catch((err) => setSlotsError(err instanceof ApiError ? err.message : "Could not load slots."))
      .finally(() => setLoadingSlots(false));
  }, [appointment.doctorId, date]);

  async function handlePick(slot: Slot) {
    setSubmittingSlot(slot.start);
    try {
      await apiPatch(`/appointments/${appointment.id}/reschedule`, { slotStart: slot.start });
      onDone();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not reschedule this appointment.");
    } finally {
      setSubmittingSlot(null);
    }
  }

  return (
    <div className="mt-3 rounded-md border border-slate-200 p-3">
      <input
        type="date"
        value={date}
        min={todayIso()}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      <ErrorText>{slotsError}</ErrorText>

      {loadingSlots ? (
        <p className="mt-3 text-sm text-slate-500">Loading slots...</p>
      ) : slots.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No available slots on this date.</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {slots.map((slot) => (
            <Button
              key={slot.start}
              variant="secondary"
              disabled={submittingSlot !== null}
              onClick={() => handlePick(slot)}
            >
              {submittingSlot === slot.start ? "Moving..." : formatSlotTime(slot.start)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

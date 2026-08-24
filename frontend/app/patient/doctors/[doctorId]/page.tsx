"use client";

import confetti from "canvas-confetti";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, ErrorText, Textarea } from "../../../../components/ui";
import { Reveal, Stagger, StaggerItem } from "../../../../components/motion";
import { apiGet, apiPost, ApiError } from "../../../../lib/api";
import { Appointment, Doctor, Slot } from "../../../../lib/types";

function celebrate() {
  const colors = ["#7440e0", "#a685f5", "#a3e635", "#65a30d"];
  confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 }, colors, startVelocity: 45 });
  setTimeout(() => confetti({ particleCount: 50, spread: 100, origin: { y: 0.6 }, colors, scalar: 0.8 }), 150);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

export default function DoctorBookingPage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const router = useRouter();

  const [doctor, setDoctor] = useState<Doctor | null>(null);

  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [held, setHeld] = useState<Appointment | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);

  const [symptoms, setSymptoms] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);

  useEffect(() => {
    apiGet<{ doctor: Doctor }>(`/doctors/${doctorId}`)
      .then((data) => {
        setDoctor(data.doctor);
        setDate((current) => current || data.doctor.earliestSlot?.slice(0, 10) || todayIso());
      })
      .catch(() => setDate((current) => current || todayIso()));
  }, [doctorId]);

  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true);
    setSlotsError(null);
    apiGet<{ slots: Slot[] }>(`/doctors/${doctorId}/slots?date=${date}`)
      .then((data) => setSlots(data.slots))
      .catch((err) => setSlotsError(err instanceof ApiError ? err.message : "Could not load slots."))
      .finally(() => setLoadingSlots(false));
  }, [doctorId, date]);

  const holdSecondsLeft = useHoldCountdown(held?.holdExpiresAt ?? null);

  async function handleHold(slot: Slot) {
    setHoldError(null);
    setHolding(true);
    try {
      const data = await apiPost<{ appointment: Appointment }>("/appointments/hold", {
        doctorId,
        slotStart: slot.start,
      });
      setHeld(data.appointment);
    } catch (err) {
      setHoldError(err instanceof ApiError ? err.message : "Could not hold this slot.");
    } finally {
      setHolding(false);
    }
  }

  async function handleConfirm() {
    if (!held) return;
    setConfirmError(null);
    setConfirming(true);
    try {
      const data = await apiPost<{ appointment: Appointment }>(`/appointments/${held.id}/confirm`, { symptoms });
      setConfirmed(data.appointment);
      celebrate();
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        setConfirmError("Your hold expired. Please pick a slot again.");
        setHeld(null);
      } else {
        setConfirmError(err instanceof ApiError ? err.message : "Could not confirm this appointment.");
      }
    } finally {
      setConfirming(false);
    }
  }

  if (confirmed) {
    return (
      <Reveal className="max-w-xl">
        <Card>
          <h1 className="text-xl font-semibold text-emerald-700">Appointment confirmed</h1>
          <p className="mt-2 text-slate-600">
            Your appointment is booked for {new Date(confirmed.slotStart).toUTCString()}.
          </p>
          {confirmed.preVisitSummary?.generationFailed ? (
            <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              AI summary unavailable — your symptoms were saved and the doctor will review them directly.
            </p>
          ) : confirmed.preVisitSummary ? (
            <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
              <p>
                <strong>Urgency:</strong> {confirmed.preVisitSummary.urgency}
              </p>
              <p className="mt-1">{confirmed.preVisitSummary.chiefComplaint}</p>
            </div>
          ) : null}
          <Button className="mt-6" onClick={() => router.push("/patient/appointments")}>
            View my appointments
          </Button>
        </Card>
      </Reveal>
    );
  }

  if (held) {
    return (
      <Reveal className="max-w-xl">
        <Card>
          <h1 className="text-xl font-semibold">Confirm your appointment</h1>
          <p className="mt-1 text-sm text-slate-600">
            Slot held: {new Date(held.slotStart).toUTCString()}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            {holdSecondsLeft > 0
              ? `Hold expires in ${Math.floor(holdSecondsLeft / 60)}:${String(holdSecondsLeft % 60).padStart(2, "0")}`
              : "Your hold has expired — please go back and pick a slot again."}
          </p>

          <div className="mt-4">
            <label htmlFor="symptoms" className="mb-1 block text-sm font-medium text-slate-700">
              Describe your symptoms
            </label>
            <Textarea
              id="symptoms"
              required
              rows={4}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="What's bothering you? Since when?"
            />
          </div>

          <ErrorText>{confirmError}</ErrorText>

          <div className="mt-4 flex gap-3">
            <Button
              onClick={handleConfirm}
              disabled={confirming || !symptoms.trim() || holdSecondsLeft <= 0}
            >
              {confirming ? "Confirming..." : "Confirm appointment"}
            </Button>
            <Button variant="secondary" onClick={() => setHeld(null)}>
              Back to slots
            </Button>
          </div>
        </Card>
      </Reveal>
    );
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <h1 className="font-display text-2xl font-semibold text-slate-900">Pick a time</h1>
        {doctor && <p className="text-slate-600">for your appointment with {doctor.name}</p>}
      </Reveal>

      {date && (
        <Reveal delay={0.05}>
          <h2 className="mb-2 text-sm font-medium text-slate-700">Dates</h2>
          <input
            type="date"
            value={date}
            min={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </Reveal>
      )}

      <ErrorText>{slotsError}</ErrorText>
      <ErrorText>{holdError}</ErrorText>

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-700">Time slots</h2>
        {loadingSlots ? (
          <p className="text-sm text-slate-500">Loading slots...</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-slate-500">No available slots on this date.</p>
        ) : (
          <Stagger className="grid grid-cols-3 gap-3 sm:grid-cols-4" stagger={0.03}>
            {slots.map((slot) => (
              <StaggerItem key={slot.start}>
                <Button
                  variant="secondary"
                  disabled={holding}
                  onClick={() => handleHold(slot)}
                  className="w-full"
                >
                  {formatSlotTime(slot.start)}
                </Button>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </div>
  );
}

function useHoldCountdown(holdExpiresAt: string | null) {
  const target = useMemo(() => (holdExpiresAt ? new Date(holdExpiresAt).getTime() : null), [holdExpiresAt]);
  const [secondsLeft, setSecondsLeft] = useState(() => (target ? Math.max(0, Math.floor((target - Date.now()) / 1000)) : 0));

  useEffect(() => {
    if (!target) return;
    const interval = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return secondsLeft;
}

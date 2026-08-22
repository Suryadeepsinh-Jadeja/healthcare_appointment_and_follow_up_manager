"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, ErrorText, Input, Label } from "../../../components/ui";
import { apiGet, ApiError } from "../../../lib/api";
import { Doctor } from "../../../lib/types";

function formatEarliestSlot(iso: string | null | undefined): string {
  if (!iso) return "No upcoming availability";
  const date = new Date(iso);
  return `Next available: ${date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })}`;
}

export default function DoctorSearchPage() {
  const [specialisation, setSpecialisation] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const query = specialisation ? `?specialisation=${encodeURIComponent(specialisation)}` : "";
    apiGet<{ doctors: Doctor[] }>(`/doctors${query}`)
      .then((data) => setDoctors(data.doctors))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load doctors."))
      .finally(() => setLoading(false));
  }, [specialisation]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Find a doctor</h1>
        <p className="text-slate-600">Search by specialisation and pick a time that works for you.</p>
      </div>

      <div className="max-w-xs">
        <Label htmlFor="specialisation">Specialisation</Label>
        <Input
          id="specialisation"
          placeholder="e.g. Cardiology"
          value={specialisation}
          onChange={(e) => setSpecialisation(e.target.value)}
        />
      </div>

      <ErrorText>{error}</ErrorText>

      {loading ? (
        <p className="text-sm text-slate-500">Loading doctors...</p>
      ) : doctors.length === 0 ? (
        <p className="text-sm text-slate-500">No doctors found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {doctors.map((doctor) => (
            <Link key={doctor.id} href={`/patient/doctors/${doctor.id}`}>
              <Card className="transition hover:border-slate-400">
                <h2 className="font-medium">{doctor.name}</h2>
                <p className="text-sm text-slate-600">{doctor.specialisation}</p>
                <p className="mt-2 text-xs text-slate-400">{doctor.slotDurationMin} min appointments</p>
                <p className="mt-1 text-xs font-medium text-emerald-700">{formatEarliestSlot(doctor.earliestSlot)}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

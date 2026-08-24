"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Button, Card, ErrorText, Input, Label } from "../../../components/ui";
import { WorkingHoursEditor, WorkingHoursState, workingHoursStateToPayload } from "../../../components/WorkingHoursEditor";
import { apiGet, apiPost, ApiError } from "../../../lib/api";
import { Doctor } from "../../../lib/types";

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialisation, setSpecialisation] = useState("");
  const [slotDurationMin, setSlotDurationMin] = useState(20);
  const [workingHours, setWorkingHours] = useState<WorkingHoursState>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    apiGet<{ doctors: Doctor[] }>("/doctors")
      .then((data) => setDoctors(data.doctors))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/admin/doctors", {
        name,
        email,
        password,
        specialisation,
        slotDurationMin,
        workingHours: workingHoursStateToPayload(workingHours),
      });
      setName("");
      setEmail("");
      setPassword("");
      setSpecialisation("");
      setWorkingHours({});
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create doctor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Doctors</h1>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading...</p>
        ) : (
          <div className="mt-4 space-y-3">
            {doctors.map((doctor) => (
              <Link key={doctor.id} href={`/admin/doctors/${doctor.id}`}>
                <Card className="transition hover:border-brand-300 hover:shadow-md hover:shadow-brand-900/5">
                  <p className="font-medium">{doctor.name}</p>
                  <p className="text-sm text-slate-600">
                    {doctor.specialisation} — {doctor.slotDurationMin} min slots
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Card>
        <h2 className="font-medium">Add a doctor</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Temporary password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
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

          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create doctor"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

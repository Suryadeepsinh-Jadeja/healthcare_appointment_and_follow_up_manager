"use client";

import { Input, Label } from "./ui";

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
] as const;

export type WorkingHoursState = Record<string, string>;

/** Each value is a comma-separated list of "HH:MM-HH:MM" windows, or empty for a day off. */
export function WorkingHoursEditor({
  value,
  onChange,
}: {
  value: WorkingHoursState;
  onChange: (value: WorkingHoursState) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Working hours</Label>
      {DAYS.map((day) => (
        <div key={day.key} className="flex items-center gap-3">
          <span className="w-10 text-sm text-slate-600">{day.label}</span>
          <Input
            placeholder="09:00-13:00,14:00-17:00 (leave empty for day off)"
            value={value[day.key] ?? ""}
            onChange={(e) => onChange({ ...value, [day.key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

export function workingHoursStateToPayload(state: WorkingHoursState): Record<string, string[]> {
  const payload: Record<string, string[]> = {};
  for (const [day, raw] of Object.entries(state)) {
    const windows = raw
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);
    if (windows.length > 0) payload[day] = windows;
  }
  return payload;
}

export function workingHoursPayloadToState(payload: Record<string, string[]>): WorkingHoursState {
  const state: WorkingHoursState = {};
  for (const day of DAYS) {
    state[day.key] = (payload[day.key] ?? []).join(",");
  }
  return state;
}

"use client";

import { useState } from "react";
import { toDateKey } from "../lib/workingHours";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function DatePicker({
  value,
  onChange,
  isDayDisabled,
}: {
  value: string;
  onChange: (date: string) => void;
  /** Beyond the always-disabled past, mark additional days (e.g. days the doctor never works) as unavailable. */
  isDayDisabled?: (date: Date) => boolean;
}) {
  const selected = new Date(`${value}T00:00:00`);
  const [viewMonth, setViewMonth] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));

  const today = startOfDay(new Date());
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

  const cells: Array<Date | null> = Array(firstOfMonth.getDay()).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
  }

  function isDisabled(date: Date): boolean {
    if (startOfDay(date) < today) return true;
    return isDayDisabled ? isDayDisabled(date) : false;
  }

  return (
    <div className="inline-block rounded-md border border-slate-300 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          ‹
        </button>
        <span className="font-medium">
          {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i}>{label}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const key = toDateKey(date);
          const disabled = isDisabled(date);
          const isSelected = key === value;

          return (
            <button
              type="button"
              key={i}
              disabled={disabled}
              onClick={() => onChange(key)}
              className={cx(
                "rounded-md py-1.5 text-sm transition",
                isSelected ? "bg-slate-900 text-white" : "hover:bg-slate-100",
                disabled && "cursor-not-allowed text-slate-300 hover:bg-transparent",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

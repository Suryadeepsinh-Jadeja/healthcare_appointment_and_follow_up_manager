"use client";

import { type LucideIcon } from "lucide-react";
import { Card } from "./ui";
import { useCountUp } from "../lib/useCountUp";

const tones = {
  brand: "bg-brand-50 text-brand-700",
  accent: "bg-accent-100 text-accent-600",
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-700",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "brand",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: keyof typeof tones;
}) {
  const display = useCountUp(value);
  return (
    <Card className="h-full">
      <div className="flex items-center gap-3.5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-2xl font-semibold text-slate-900">{display}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}

export type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export type WorkingHours = Partial<Record<DayKey, string[]>>;

const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface Slot {
  start: Date;
  end: Date;
}

export interface ComputeAvailableSlotsInput {
  /** Calendar date to compute slots for, as "YYYY-MM-DD". */
  date: string;
  workingHours: WorkingHours;
  slotDurationMin: number;
  /** Start times (UTC) of existing HELD/CONFIRMED appointments on this date. */
  bookedSlotStarts: Date[];
  /** Whether the doctor has a DoctorLeave entry covering this date. */
  isOnLeave: boolean;
}

function parseDateParts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month: month - 1, day };
}

function parseWindow(window: string): { startMin: number; endMin: number } {
  const [start, end] = window.split("-");
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  return { startMin: startH * 60 + startM, endMin: endH * 60 + endM };
}

/**
 * Pure function: computes bookable slots for a single doctor on a single date.
 * Takes no dependency on the database — leave/booking state must be resolved by the caller.
 */
export function computeAvailableSlots(input: ComputeAvailableSlotsInput): Slot[] {
  const { date, workingHours, slotDurationMin, bookedSlotStarts, isOnLeave } = input;

  if (isOnLeave || slotDurationMin <= 0) {
    return [];
  }

  const { year, month, day } = parseDateParts(date);
  const dayKey = DAY_KEYS[new Date(Date.UTC(year, month, day)).getUTCDay()];
  const windows = workingHours[dayKey];

  if (!windows || windows.length === 0) {
    return [];
  }

  const bookedStartsMs = new Set(bookedSlotStarts.map((d) => d.getTime()));
  const slots: Slot[] = [];

  for (const window of windows) {
    const { startMin, endMin } = parseWindow(window);

    for (let slotStartMin = startMin; slotStartMin + slotDurationMin <= endMin; slotStartMin += slotDurationMin) {
      const start = new Date(Date.UTC(year, month, day, 0, slotStartMin));
      const end = new Date(Date.UTC(year, month, day, 0, slotStartMin + slotDurationMin));

      if (!bookedStartsMs.has(start.getTime())) {
        slots.push({ start, end });
      }
    }
  }

  return slots;
}

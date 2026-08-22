import { describe, expect, it } from "vitest";
import { computeAvailableSlots, WorkingHours } from "../src/modules/appointments/slots";

const workingHours: WorkingHours = {
  mon: ["09:00-10:00"],
  wed: ["10:00-11:00", "14:00-14:40"],
};

describe("computeAvailableSlots", () => {
  it("generates evenly spaced slots for a working window", () => {
    // 2026-08-24 is a Monday
    const slots = computeAvailableSlots({
      date: "2026-08-24",
      workingHours,
      slotDurationMin: 20,
      bookedSlotStarts: [],
      isOnLeave: false,
    });

    expect(slots).toHaveLength(3);
    expect(slots[0].start.toISOString()).toBe("2026-08-24T09:00:00.000Z");
    expect(slots[0].end.toISOString()).toBe("2026-08-24T09:20:00.000Z");
    expect(slots[2].start.toISOString()).toBe("2026-08-24T09:40:00.000Z");
    expect(slots[2].end.toISOString()).toBe("2026-08-24T10:00:00.000Z");
  });

  it("does not emit a trailing partial slot that would overrun the window", () => {
    // 14:00-14:40 window with 20 min slots divides evenly (2 slots); shrink to test the remainder case
    const slots = computeAvailableSlots({
      date: "2026-08-26", // Wednesday
      workingHours: { wed: ["14:00-14:50"] },
      slotDurationMin: 20,
      bookedSlotStarts: [],
      isOnLeave: false,
    });

    // Only 2 full 20-minute slots fit in 50 minutes; the trailing 10 minutes must not appear
    expect(slots).toHaveLength(2);
    expect(slots[1].end.toISOString()).toBe("2026-08-26T14:40:00.000Z");
  });

  it("returns no slots on a day with no configured working hours", () => {
    const slots = computeAvailableSlots({
      date: "2026-08-25", // Tuesday, not in workingHours
      workingHours,
      slotDurationMin: 20,
      bookedSlotStarts: [],
      isOnLeave: false,
    });

    expect(slots).toEqual([]);
  });

  it("excludes the whole day when the doctor is on leave", () => {
    const slots = computeAvailableSlots({
      date: "2026-08-24",
      workingHours,
      slotDurationMin: 20,
      bookedSlotStarts: [],
      isOnLeave: true,
    });

    expect(slots).toEqual([]);
  });

  it("excludes slots already covered by an existing HELD/CONFIRMED appointment", () => {
    const bookedSlotStarts = [new Date("2026-08-24T09:20:00.000Z")];

    const slots = computeAvailableSlots({
      date: "2026-08-24",
      workingHours,
      slotDurationMin: 20,
      bookedSlotStarts,
      isOnLeave: false,
    });

    expect(slots).toHaveLength(2);
    expect(slots.map((s) => s.start.toISOString())).toEqual([
      "2026-08-24T09:00:00.000Z",
      "2026-08-24T09:40:00.000Z",
    ]);
  });

  it("handles multiple working-hour windows on the same day independently", () => {
    const slots = computeAvailableSlots({
      date: "2026-08-26", // Wednesday: 10:00-11:00 and 14:00-14:40
      workingHours,
      slotDurationMin: 20,
      bookedSlotStarts: [],
      isOnLeave: false,
    });

    expect(slots).toHaveLength(5);
    expect(slots[2].start.toISOString()).toBe("2026-08-26T10:40:00.000Z");
    expect(slots[3].start.toISOString()).toBe("2026-08-26T14:00:00.000Z");
  });
});

import { DoctorProfile } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/errors";
import { computeAvailableSlots, Slot, WorkingHours } from "../appointments/slots";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EARLIEST_SLOT_HORIZON_DAYS = 60;

async function listSlotsForDate(doctor: DoctorProfile, date: string): Promise<Slot[]> {
  const { dayStart, dayEnd } = dayRange(date);

  const [isOnLeave, appointments] = await Promise.all([
    isDoctorOnLeave(doctor.id, date),
    prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        slotStart: { gte: dayStart, lte: dayEnd },
        status: { in: ["HELD", "CONFIRMED"] },
      },
      select: { slotStart: true },
    }),
  ]);

  return computeAvailableSlots({
    date,
    workingHours: doctor.workingHours as WorkingHours,
    slotDurationMin: doctor.slotDurationMin,
    bookedSlotStarts: appointments.map((appointment) => appointment.slotStart),
    isOnLeave,
  });
}

/**
 * Scans forward day by day for the soonest bookable slot. The working-hours-only check (no
 * booked/leave lookup) is free, so it skips days the doctor never works before touching the DB —
 * for a typical 5-day week that's at most a couple of wasted iterations, not one per day of the horizon.
 */
async function findEarliestAvailableSlot(doctor: DoctorProfile): Promise<Slot | null> {
  const workingHours = doctor.workingHours as WorkingHours;
  const now = Date.now();

  for (let offset = 0; offset < EARLIEST_SLOT_HORIZON_DAYS; offset++) {
    const date = new Date(now + offset * MS_PER_DAY).toISOString().slice(0, 10);

    const worksThatWeekday = computeAvailableSlots({
      date,
      workingHours,
      slotDurationMin: doctor.slotDurationMin,
      bookedSlotStarts: [],
      isOnLeave: false,
    }).length > 0;
    if (!worksThatWeekday) continue;

    const slots = (await listSlotsForDate(doctor, date)).filter((slot) => slot.start.getTime() > now);
    if (slots.length > 0) {
      return slots[0];
    }
  }

  return null;
}

export async function listDoctors(specialisation?: string, includeInactive = false) {
  const doctors = await prisma.doctorProfile.findMany({
    where: {
      ...(specialisation ? { specialisation: { equals: specialisation, mode: "insensitive" } } : {}),
      ...(includeInactive ? {} : { active: true }),
    },
    include: { user: { select: { name: true } } },
    orderBy: { specialisation: "asc" },
  });

  return Promise.all(
    doctors.map(async (doctor) => ({
      id: doctor.id,
      name: doctor.user.name,
      specialisation: doctor.specialisation,
      slotDurationMin: doctor.slotDurationMin,
      workingHours: doctor.workingHours,
      active: doctor.active,
      earliestSlot: doctor.active ? (await findEarliestAvailableSlot(doctor))?.start.toISOString() ?? null : null,
    })),
  );
}

export async function getDoctorById(doctorId: string) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: { user: { select: { name: true } } },
  });
  if (!doctor) {
    throw new HttpError("Doctor not found", 404);
  }

  return {
    id: doctor.id,
    name: doctor.user.name,
    specialisation: doctor.specialisation,
    slotDurationMin: doctor.slotDurationMin,
    workingHours: doctor.workingHours,
    active: doctor.active,
    earliestSlot: doctor.active ? (await findEarliestAvailableSlot(doctor))?.start.toISOString() ?? null : null,
  };
}

export function dayRange(date: string) {
  return {
    dayStart: new Date(`${date}T00:00:00.000Z`),
    dayEnd: new Date(`${date}T23:59:59.999Z`),
  };
}

export async function isDoctorOnLeave(doctorId: string, date: string): Promise<boolean> {
  const { dayStart, dayEnd } = dayRange(date);
  const leave = await prisma.doctorLeave.findFirst({
    where: { doctorId, date: { gte: dayStart, lte: dayEnd } },
  });
  return Boolean(leave);
}

export async function getDoctorSlots(doctorId: string, date: string) {
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor) {
    throw new HttpError("Doctor not found", 404);
  }
  if (!doctor.active) {
    return [];
  }

  return listSlotsForDate(doctor, date);
}

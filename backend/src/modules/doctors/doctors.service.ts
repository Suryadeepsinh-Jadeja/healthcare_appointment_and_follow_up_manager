import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/errors";
import { computeAvailableSlots, WorkingHours } from "../appointments/slots";

export async function listDoctors(specialisation?: string) {
  const doctors = await prisma.doctorProfile.findMany({
    where: specialisation ? { specialisation: { equals: specialisation, mode: "insensitive" } } : undefined,
    include: { user: { select: { name: true } } },
    orderBy: { specialisation: "asc" },
  });

  return doctors.map((doctor) => ({
    id: doctor.id,
    name: doctor.user.name,
    specialisation: doctor.specialisation,
    slotDurationMin: doctor.slotDurationMin,
  }));
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

  const { dayStart, dayEnd } = dayRange(date);

  const [isOnLeave, appointments] = await Promise.all([
    isDoctorOnLeave(doctorId, date),
    prisma.appointment.findMany({
      where: {
        doctorId,
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

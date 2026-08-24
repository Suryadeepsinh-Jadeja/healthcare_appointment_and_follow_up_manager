import bcrypt from "bcrypt";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/errors";
import { dayRange } from "../doctors/doctors.service";
import { enqueueCancellationNotifications } from "../notifications/notifications.service";
import { CreateDoctorInput, UpdateDoctorInput } from "./admin.types";

const SALT_ROUNDS = 10;

export async function createDoctor(input: CreateDoctorInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new HttpError("An account with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: Role.DOCTOR,
      name: input.name,
      phone: input.phone,
      doctorProfile: {
        create: {
          specialisation: input.specialisation,
          slotDurationMin: input.slotDurationMin,
          workingHours: input.workingHours as Prisma.InputJsonValue,
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
      doctorProfile: true,
    },
  });
}

export async function updateDoctor(doctorId: string, input: UpdateDoctorInput) {
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor) {
    throw new HttpError("Doctor not found", 404);
  }

  const [, updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: doctor.userId },
      data: { name: input.name, phone: input.phone },
    }),
    prisma.doctorProfile.update({
      where: { id: doctorId },
      data: {
        specialisation: input.specialisation,
        slotDurationMin: input.slotDurationMin,
        workingHours: input.workingHours as Prisma.InputJsonValue | undefined,
        active: input.active,
      },
      include: { user: { select: { id: true, email: true, name: true, phone: true, role: true } } },
    }),
  ]);

  return updated;
}

/**
 * Doctors are never hard-deleted — their appointment history (prescriptions,
 * visit notes) has to survive for patients and compliance. "Deleting" a
 * doctor deactivates them instead: they drop out of patient search/booking,
 * and any of their still-future HELD/CONFIRMED appointments are cancelled
 * and patients notified, mirroring the leave-day cancellation flow.
 */
export async function deactivateDoctor(doctorId: string) {
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor) {
    throw new HttpError("Doctor not found", 404);
  }

  const { affected } = await prisma.$transaction(async (tx) => {
    await tx.doctorProfile.update({ where: { id: doctorId }, data: { active: false } });

    const affected = await tx.appointment.findMany({
      where: { doctorId, slotStart: { gte: new Date() }, status: { in: ["HELD", "CONFIRMED"] } },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    if (affected.length > 0) {
      await tx.appointment.updateMany({
        where: { id: { in: affected.map((appointment) => appointment.id) } },
        data: { status: "CANCELLED", holdExpiresAt: null },
      });
    }

    return { affected };
  });

  for (const appointment of affected) {
    if (appointment.status !== "CONFIRMED") continue;

    try {
      await enqueueCancellationNotifications({
        appointmentId: appointment.id,
        patientEmail: appointment.patient.user.email,
        patientName: appointment.patient.user.name,
        doctorId: appointment.doctorId,
        doctorEmail: appointment.doctor.user.email,
        doctorName: appointment.doctor.user.name,
        specialisation: appointment.doctor.specialisation,
        slotStart: appointment.slotStart,
        doctorUserId: appointment.doctor.user.id,
        patientUserId: appointment.patient.user.id,
        googleEventIdPatient: appointment.googleEventIdPatient,
        googleEventIdDoctor: appointment.googleEventIdDoctor,
        reason: "the doctor is no longer available",
      });
    } catch (error) {
      console.error(`Failed to enqueue cancellation notifications for ${appointment.id}:`, error);
    }
  }

  return { cancelledCount: affected.length };
}

export async function createDoctorLeave(doctorId: string, date: string, reason?: string) {
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor) {
    throw new HttpError("Doctor not found", 404);
  }

  const { dayStart, dayEnd } = dayRange(date);

  const { leave, affected } = await prisma.$transaction(async (tx) => {
    const leave = await tx.doctorLeave.create({
      data: { doctorId, date: new Date(`${date}T00:00:00.000Z`), reason },
    });

    const affected = await tx.appointment.findMany({
      where: { doctorId, slotStart: { gte: dayStart, lte: dayEnd }, status: { in: ["HELD", "CONFIRMED"] } },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    if (affected.length > 0) {
      await tx.appointment.updateMany({
        where: { id: { in: affected.map((appointment) => appointment.id) } },
        data: { status: "CANCELLED", holdExpiresAt: null },
      });
    }

    return { leave, affected };
  });

  // Post-commit: only appointments that were CONFIRMED had confirmation
  // notifications sent (and possibly calendar events created) in the first
  // place, mirroring the same rule used for patient self-cancellation.
  for (const appointment of affected) {
    if (appointment.status !== "CONFIRMED") continue;

    try {
      await enqueueCancellationNotifications({
        appointmentId: appointment.id,
        patientEmail: appointment.patient.user.email,
        patientName: appointment.patient.user.name,
        doctorId: appointment.doctorId,
        doctorEmail: appointment.doctor.user.email,
        doctorName: appointment.doctor.user.name,
        specialisation: appointment.doctor.specialisation,
        slotStart: appointment.slotStart,
        doctorUserId: appointment.doctor.user.id,
        patientUserId: appointment.patient.user.id,
        googleEventIdPatient: appointment.googleEventIdPatient,
        googleEventIdDoctor: appointment.googleEventIdDoctor,
        reason: reason ?? "the doctor is on leave",
      });
    } catch (error) {
      console.error(`Failed to enqueue cancellation notifications for ${appointment.id}:`, error);
    }
  }

  return { leave, cancelledCount: affected.length };
}

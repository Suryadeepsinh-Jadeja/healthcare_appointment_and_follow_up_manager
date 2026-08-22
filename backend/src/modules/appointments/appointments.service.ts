import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/errors";
import { isDoctorOnLeave } from "../doctors/doctors.service";
import { generatePreVisitSummary } from "../llm/preVisitSummary";
import {
  enqueueBookingConfirmationNotifications,
  enqueueCancellationNotifications,
} from "../notifications/notifications.service";
import { computeAvailableSlots, WorkingHours } from "./slots";

const HOLD_DURATION_MS = 5 * 60 * 1000;

async function getPatientProfileOrThrow(userId: string) {
  const patientProfile = await prisma.patientProfile.findUnique({ where: { userId } });
  if (!patientProfile) {
    throw new HttpError("Patient profile not found", 404);
  }
  return patientProfile;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function assertSlotIsBookable(doctorId: string, slotStart: Date) {
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor) {
    throw new HttpError("Doctor not found", 404);
  }

  const date = toDateKey(slotStart);
  const isOnLeave = await isDoctorOnLeave(doctorId, date);

  // Legitimacy check only (working hours + leave day) — deliberately ignores
  // current bookings, since preventing double-booking is the unique
  // constraint's job at INSERT time, not this pre-check's.
  const validSlots = computeAvailableSlots({
    date,
    workingHours: doctor.workingHours as WorkingHours,
    slotDurationMin: doctor.slotDurationMin,
    bookedSlotStarts: [],
    isOnLeave,
  });

  const matches = validSlots.some((slot) => slot.start.getTime() === slotStart.getTime());
  if (!matches) {
    throw new HttpError("Requested slot is not within the doctor's working hours", 400);
  }

  return doctor;
}

export async function holdAppointment(userId: string, doctorId: string, slotStartInput: string) {
  const patientProfile = await getPatientProfileOrThrow(userId);
  const slotStart = new Date(slotStartInput);

  const doctor = await assertSlotIsBookable(doctorId, slotStart);
  const slotEnd = new Date(slotStart.getTime() + doctor.slotDurationMin * 60 * 1000);

  try {
    return await prisma.appointment.create({
      data: {
        doctorId,
        patientId: patientProfile.id,
        slotStart,
        slotEnd,
        holdExpiresAt: new Date(Date.now() + HOLD_DURATION_MS),
      },
    });
  } catch (error) {
    // Prisma P2002 is the unique-constraint violation, i.e. Postgres 23505 —
    // the @@unique([doctorId, slotStart]) constraint rejecting a conflict.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError("This slot was just taken — please pick another", 409);
    }
    throw error;
  }
}

async function getOwnedAppointmentOrThrow(userId: string, appointmentId: string) {
  const patientProfile = await getPatientProfileOrThrow(userId);
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });

  if (!appointment || appointment.patientId !== patientProfile.id) {
    throw new HttpError("Appointment not found", 404);
  }

  return appointment;
}

export async function confirmAppointment(userId: string, appointmentId: string, symptoms: string) {
  const appointment = await getOwnedAppointmentOrThrow(userId, appointmentId);

  if (appointment.status !== "HELD") {
    throw new HttpError("Appointment is not in a holdable state", 409);
  }
  if (appointment.holdExpiresAt && appointment.holdExpiresAt.getTime() < Date.now()) {
    await prisma.appointment.delete({ where: { id: appointment.id } });
    throw new HttpError("Hold has expired — please request a new hold", 410);
  }

  const preVisitSummary = await generatePreVisitSummary(symptoms);

  const confirmed = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: "CONFIRMED",
      holdExpiresAt: null,
      symptomForm: { symptoms },
      preVisitSummary: preVisitSummary as unknown as Prisma.InputJsonValue,
    },
  });

  // The appointment is already confirmed at this point — an enqueue failure
  // (e.g. Redis unreachable) must not turn a successful confirm into a
  // failed request. Any real failure still surfaces per-notification via
  // NotificationLog / GET /admin/notifications/failed.
  try {
    await enqueueBookingConfirmationNotifications(confirmed.id);
  } catch (error) {
    console.error(`Failed to enqueue booking confirmation notifications for ${confirmed.id}:`, error);
  }

  return confirmed;
}

export async function cancelAppointment(userId: string, appointmentId: string) {
  await getOwnedAppointmentOrThrow(userId, appointmentId);

  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    include: {
      doctor: { include: { user: { select: { id: true, email: true, name: true } } } },
      patient: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  });

  if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
    throw new HttpError("Appointment cannot be cancelled", 409);
  }

  const wasConfirmed = appointment.status === "CONFIRMED";

  // Deleted, not soft-cancelled: @@unique([doctorId, slotStart]) is keyed on
  // the row existing at all, so leaving a CANCELLED row in place would
  // permanently block that slot from ever being rebooked. Doctor-leave-driven
  // cancellations (Phase 8) are a different case — those set status =
  // CANCELLED per spec, which is fine because the whole day is already
  // excluded from availability by the leave record itself.
  await prisma.appointment.delete({ where: { id: appointment.id } });

  // Only a previously-CONFIRMED appointment had confirmation notifications
  // sent (and possibly calendar events created) in the first place — a HELD
  // appointment never got that far, so there's nothing to notify about.
  if (wasConfirmed) {
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
      });
    } catch (error) {
      console.error(`Failed to enqueue cancellation notifications for ${appointment.id}:`, error);
    }
  }

  return { ...appointment, status: "CANCELLED" as const, holdExpiresAt: null };
}

export async function listMyAppointments(userId: string) {
  const patientProfile = await getPatientProfileOrThrow(userId);

  return prisma.appointment.findMany({
    where: { patientId: patientProfile.id },
    include: { doctor: { include: { user: { select: { name: true } } } } },
    orderBy: { slotStart: "desc" },
  });
}

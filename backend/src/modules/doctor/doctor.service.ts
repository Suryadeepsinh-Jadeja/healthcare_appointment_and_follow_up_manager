import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/errors";
import { generatePostVisitSummary } from "../llm/postVisitSummary";
import { scheduleMedicationReminders } from "../notifications/notifications.service";
import { dayRange } from "../doctors/doctors.service";
import { SubmitNotesInput } from "./doctor.types";

async function getDoctorProfileOrThrow(userId: string) {
  const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId } });
  if (!doctorProfile) {
    throw new HttpError("Doctor profile not found", 404);
  }
  return doctorProfile;
}

export async function listDoctorAppointments(userId: string, date?: string) {
  const doctorProfile = await getDoctorProfileOrThrow(userId);

  const dateFilter = date ? { slotStart: { gte: dayRange(date).dayStart, lte: dayRange(date).dayEnd } } : {};

  return prisma.appointment.findMany({
    where: { doctorId: doctorProfile.id, ...dateFilter },
    include: { patient: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { slotStart: "asc" },
  });
}

async function getOwnedAppointmentOrThrow(userId: string, appointmentId: string) {
  const doctorProfile = await getDoctorProfileOrThrow(userId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: { include: { user: { select: { id: true, email: true, name: true } } } } },
  });

  if (!appointment || appointment.doctorId !== doctorProfile.id) {
    throw new HttpError("Appointment not found", 404);
  }

  return appointment;
}

export async function getDoctorAppointment(userId: string, appointmentId: string) {
  return getOwnedAppointmentOrThrow(userId, appointmentId);
}

export async function submitVisitNotes(userId: string, appointmentId: string, input: SubmitNotesInput) {
  const appointment = await getOwnedAppointmentOrThrow(userId, appointmentId);

  if (appointment.status !== "CONFIRMED") {
    throw new HttpError("Notes can only be submitted for a confirmed appointment", 409);
  }

  const postVisitSummary = await generatePostVisitSummary(input.notes);

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: "COMPLETED",
      postVisitNotes: input.notes,
      prescription: input.prescription as unknown as Prisma.InputJsonValue,
      postVisitSummary: postVisitSummary as unknown as Prisma.InputJsonValue,
    },
    include: { patient: { include: { user: { select: { id: true, email: true, name: true } } } } },
  });

  // Notes + prescription are already saved at this point — reminder
  // scheduling is best-effort and must never turn a successful notes
  // submission into a failed request (any real failure is still visible per
  // dose via NotificationLog / GET /admin/notifications/failed).
  for (const item of input.prescription) {
    try {
      await scheduleMedicationReminders({
        appointmentId: appointment.id,
        patientEmail: appointment.patient.user.email,
        patientName: appointment.patient.user.name,
        drug: item.drug,
        dose: item.dose,
        timesPerDay: item.timesPerDay,
        days: item.days,
      });
    } catch (error) {
      console.error(`Failed to schedule medication reminders for ${item.drug}:`, error);
    }
  }

  return updated;
}

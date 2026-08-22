import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { notificationsQueue } from "../../jobs/queues";
import { NotificationJobData } from "./notifications.types";

const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 5000;

type NotificationInput = Omit<NotificationJobData, "notificationLogId">;

/**
 * If adding the job itself throws (bad jobId, Redis unreachable, ...), the
 * log row would otherwise be stuck at PENDING forever with no job to ever
 * update it — invisible to both retries and the admin's failed-notifications
 * view. Marking it FAILED here means an enqueue-time failure is never
 * silently lost.
 */
async function addNotificationJob(jobId: string, data: NotificationJobData, delayMs: number | undefined) {
  try {
    await notificationsQueue.add(jobId, data, {
      jobId,
      delay: delayMs,
      attempts: RETRY_ATTEMPTS,
      backoff: { type: "exponential", delay: RETRY_BASE_DELAY_MS },
      removeOnComplete: true,
      removeOnFail: false,
    });
  } catch (error) {
    await prisma.notificationLog.update({
      where: { id: data.notificationLogId },
      data: { status: "FAILED", lastError: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }
}

/**
 * Idempotent per appointmentId+type+channel: reuses an existing log row (and
 * therefore the same BullMQ jobId) instead of creating a duplicate, so
 * re-calling this for the same event never produces a duplicate send. The
 * created/reused log row's id travels with the job so the worker can update
 * that exact row — appointmentId+type+channel alone isn't precise enough
 * once medication reminders (many rows per appointment+type+channel) exist.
 */
async function enqueueSingleShotNotification(data: NotificationInput, delayMs?: number): Promise<void> {
  const jobId = `${data.channel}__${data.type}__${data.appointmentId}`;

  let log = await prisma.notificationLog.findFirst({
    where: { appointmentId: data.appointmentId, type: data.type, channel: data.channel },
  });
  if (!log) {
    log = await prisma.notificationLog.create({
      data: { appointmentId: data.appointmentId, type: data.type, channel: data.channel, status: "PENDING", attempts: 0 },
    });
  }

  await addNotificationJob(jobId, { ...data, notificationLogId: log.id }, delayMs);
}

const REMINDER_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

export async function enqueueBookingConfirmationNotifications(appointmentId: string): Promise<void> {
  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    include: {
      doctor: { include: { user: true } },
      patient: { include: { user: true } },
    },
  });

  const shared = {
    appointmentId,
    patientEmail: appointment.patient.user.email,
    patientName: appointment.patient.user.name,
    doctorEmail: appointment.doctor.user.email,
    doctorName: appointment.doctor.user.name,
    specialisation: appointment.doctor.specialisation,
    slotStart: appointment.slotStart.toISOString(),
  };

  await enqueueSingleShotNotification({ ...shared, type: "BOOKING_CONFIRM", channel: "EMAIL" });

  await enqueueSingleShotNotification({
    ...shared,
    type: "BOOKING_CONFIRM",
    channel: "CALENDAR",
    doctorUserId: appointment.doctor.user.id,
    patientUserId: appointment.patient.user.id,
    slotEnd: appointment.slotEnd.toISOString(),
  });

  const reminderDelay = appointment.slotStart.getTime() - REMINDER_LEAD_TIME_MS - Date.now();
  if (reminderDelay > 0) {
    await enqueueSingleShotNotification({ ...shared, type: "REMINDER", channel: "EMAIL" }, reminderDelay);
  }
}

export interface CancellationSnapshot {
  appointmentId: string;
  patientEmail: string;
  patientName: string;
  doctorId: string;
  doctorEmail: string;
  doctorName: string;
  specialisation: string;
  slotStart: Date;
  doctorUserId: string;
  patientUserId: string;
  googleEventIdPatient: string | null;
  googleEventIdDoctor: string | null;
  reason?: string;
}

export async function enqueueCancellationNotifications(snapshot: CancellationSnapshot): Promise<void> {
  const shared = {
    appointmentId: snapshot.appointmentId,
    patientEmail: snapshot.patientEmail,
    patientName: snapshot.patientName,
    doctorEmail: snapshot.doctorEmail,
    doctorName: snapshot.doctorName,
    specialisation: snapshot.specialisation,
    slotStart: snapshot.slotStart.toISOString(),
    reason: snapshot.reason,
  };

  await enqueueSingleShotNotification({
    ...shared,
    type: "CANCELLATION",
    channel: "EMAIL",
    rebookUrl: `${env.frontendUrl}/patient/doctors/${snapshot.doctorId}`,
  });

  if (snapshot.googleEventIdPatient || snapshot.googleEventIdDoctor) {
    await enqueueSingleShotNotification({
      appointmentId: snapshot.appointmentId,
      type: "CANCELLATION",
      channel: "CALENDAR",
      doctorUserId: snapshot.doctorUserId,
      patientUserId: snapshot.patientUserId,
      googleEventIdPatient: snapshot.googleEventIdPatient,
      googleEventIdDoctor: snapshot.googleEventIdDoctor,
    });
  }
}

/** Removes a still-pending REMINDER email (queued job + log row) so a reschedule doesn't leave a stale one announcing the old time. */
async function cancelPendingReminder(appointmentId: string): Promise<void> {
  const jobId = `EMAIL__REMINDER__${appointmentId}`;
  try {
    const job = await notificationsQueue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  } catch (error) {
    console.error(`Failed to remove stale reminder job for ${appointmentId}:`, error);
  }
  await prisma.notificationLog.deleteMany({
    where: { appointmentId, type: "REMINDER", channel: "EMAIL", status: "PENDING" },
  });
}

export interface RescheduleSnapshot {
  appointmentId: string;
  previousSlotStart: Date;
  slotStart: Date;
  slotEnd: Date;
  patientEmail: string;
  patientName: string;
  doctorEmail: string;
  doctorName: string;
  specialisation: string;
  doctorUserId: string;
  patientUserId: string;
  googleEventIdPatient: string | null;
  googleEventIdDoctor: string | null;
}

export async function enqueueRescheduleNotifications(snapshot: RescheduleSnapshot): Promise<void> {
  const shared = {
    appointmentId: snapshot.appointmentId,
    patientEmail: snapshot.patientEmail,
    patientName: snapshot.patientName,
    doctorEmail: snapshot.doctorEmail,
    doctorName: snapshot.doctorName,
    specialisation: snapshot.specialisation,
    slotStart: snapshot.slotStart.toISOString(),
    previousSlotStart: snapshot.previousSlotStart.toISOString(),
  };

  await enqueueSingleShotNotification({ ...shared, type: "RESCHEDULE", channel: "EMAIL" });

  if (snapshot.googleEventIdPatient || snapshot.googleEventIdDoctor) {
    await enqueueSingleShotNotification({
      appointmentId: snapshot.appointmentId,
      type: "RESCHEDULE",
      channel: "CALENDAR",
      doctorUserId: snapshot.doctorUserId,
      patientUserId: snapshot.patientUserId,
      patientName: snapshot.patientName,
      doctorName: snapshot.doctorName,
      slotStart: snapshot.slotStart.toISOString(),
      slotEnd: snapshot.slotEnd.toISOString(),
      googleEventIdPatient: snapshot.googleEventIdPatient,
      googleEventIdDoctor: snapshot.googleEventIdDoctor,
    });
  }

  await cancelPendingReminder(snapshot.appointmentId);
  const reminderDelay = snapshot.slotStart.getTime() - REMINDER_LEAD_TIME_MS - Date.now();
  if (reminderDelay > 0) {
    await enqueueSingleShotNotification({ ...shared, type: "REMINDER", channel: "EMAIL" }, reminderDelay);
  }
}

export interface MedicationReminderInput {
  appointmentId: string;
  patientEmail: string;
  patientName: string;
  drug: string;
  dose: string;
  timesPerDay: number;
  days: number;
  startAt?: Date;
}

/** "twice daily for 5 days" -> timesPerDay=2, days=5 -> 10 scheduled sends, evenly spaced through each day. */
export async function scheduleMedicationReminders(input: MedicationReminderInput): Promise<number> {
  const start = input.startAt ?? new Date();
  const totalReminders = input.timesPerDay * input.days;
  const intervalMs = (24 * 60 * 60 * 1000) / input.timesPerDay;
  const timing = `${input.timesPerDay}x/day for ${input.days} days`;

  for (let doseIndex = 0; doseIndex < totalReminders; doseIndex++) {
    const fireAt = start.getTime() + doseIndex * intervalMs;
    const delayMs = Math.max(0, fireAt - Date.now());
    const jobId = `EMAIL__MED_REMINDER__${input.appointmentId}__${doseIndex}`;

    const log = await prisma.notificationLog.create({
      data: {
        appointmentId: input.appointmentId,
        type: "MED_REMINDER",
        channel: "EMAIL",
        status: "PENDING",
        attempts: 0,
      },
    });

    const jobData: NotificationJobData = {
      notificationLogId: log.id,
      appointmentId: input.appointmentId,
      type: "MED_REMINDER",
      channel: "EMAIL",
      patientEmail: input.patientEmail,
      patientName: input.patientName,
      drug: input.drug,
      dose: input.dose,
      timing,
    };

    await addNotificationJob(jobId, jobData, delayMs);
  }

  return totalReminders;
}

export async function listFailedNotifications() {
  return prisma.notificationLog.findMany({
    where: { status: "FAILED" },
    orderBy: { createdAt: "desc" },
  });
}

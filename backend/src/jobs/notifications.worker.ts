import { Job, Worker } from "bullmq";
import { prisma } from "../lib/prisma";
import { sendEmail } from "../modules/notifications/email/sendEmail";
import {
  appointmentReminderEmail,
  bookingConfirmationEmail,
  cancellationEmail,
  doctorAppointmentReminderEmail,
  doctorBookingConfirmationEmail,
  doctorCancellationEmail,
  medicationReminderEmail,
  RenderedEmail,
} from "../modules/notifications/email/templates";
import {
  createCalendarEventForUser,
  deleteCalendarEventForUser,
} from "../modules/calendar/calendar.service";
import { NotificationJobData } from "../modules/notifications/notifications.types";
import { redisConnection } from "./connection";
import { NOTIFICATIONS_QUEUE_NAME } from "./queues";

/** Sends the patient's email, and the doctor's counterpart alongside it whenever a doctor email/template is given. */
async function sendPair(
  patientEmail: string,
  patientEmailRendered: RenderedEmail,
  doctorEmail: string | undefined,
  doctorEmailRendered: RenderedEmail | null,
): Promise<void> {
  const sends = [sendEmail({ to: patientEmail, subject: patientEmailRendered.subject, html: patientEmailRendered.html })];
  if (doctorEmail && doctorEmailRendered) {
    sends.push(sendEmail({ to: doctorEmail, subject: doctorEmailRendered.subject, html: doctorEmailRendered.html }));
  }
  await Promise.all(sends);
}

async function sendNotificationEmail(data: NotificationJobData): Promise<void> {
  switch (data.type) {
    case "BOOKING_CONFIRM": {
      const ctx = {
        patientName: data.patientName!,
        doctorName: data.doctorName!,
        specialisation: data.specialisation!,
        slotStart: new Date(data.slotStart!),
      };
      await sendPair(data.patientEmail!, bookingConfirmationEmail(ctx), data.doctorEmail, doctorBookingConfirmationEmail(ctx));
      return;
    }
    case "REMINDER": {
      const ctx = {
        patientName: data.patientName!,
        doctorName: data.doctorName!,
        specialisation: data.specialisation!,
        slotStart: new Date(data.slotStart!),
      };
      await sendPair(data.patientEmail!, appointmentReminderEmail(ctx), data.doctorEmail, doctorAppointmentReminderEmail(ctx));
      return;
    }
    case "CANCELLATION": {
      const ctx = {
        patientName: data.patientName!,
        doctorName: data.doctorName!,
        specialisation: data.specialisation!,
        slotStart: new Date(data.slotStart!),
      };
      await sendPair(
        data.patientEmail!,
        cancellationEmail({ ...ctx, rebookUrl: data.rebookUrl!, reason: data.reason }),
        data.doctorEmail,
        doctorCancellationEmail({ ...ctx, reason: data.reason }),
      );
      return;
    }
    case "MED_REMINDER": {
      const email = medicationReminderEmail({
        patientName: data.patientName!,
        drug: data.drug!,
        dose: data.dose!,
        timing: data.timing!,
      });
      await sendEmail({ to: data.patientEmail!, subject: email.subject, html: email.html });
      return;
    }
  }
}

async function syncCalendarEvent(data: NotificationJobData): Promise<void> {
  if (data.type === "BOOKING_CONFIRM") {
    const start = new Date(data.slotStart!);
    const end = new Date(data.slotEnd!);
    const summary = `Appointment: ${data.patientName} with ${data.doctorName}`;

    const [patientEventId, doctorEventId] = await Promise.all([
      createCalendarEventForUser(data.patientUserId!, { summary, start, end }),
      createCalendarEventForUser(data.doctorUserId!, { summary, start, end }),
    ]);

    await prisma.appointment.updateMany({
      where: { id: data.appointmentId },
      data: { googleEventIdPatient: patientEventId, googleEventIdDoctor: doctorEventId },
    });
    return;
  }

  if (data.type === "CANCELLATION") {
    await Promise.all([
      data.patientUserId && data.googleEventIdPatient
        ? deleteCalendarEventForUser(data.patientUserId, data.googleEventIdPatient)
        : Promise.resolve(),
      data.doctorUserId && data.googleEventIdDoctor
        ? deleteCalendarEventForUser(data.doctorUserId, data.googleEventIdDoctor)
        : Promise.resolve(),
    ]);
  }
}

async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
  if (job.data.channel === "EMAIL") {
    await sendNotificationEmail(job.data);
  } else {
    await syncCalendarEvent(job.data);
  }
}

export function startNotificationsWorker(): Worker<NotificationJobData> {
  return new Worker<NotificationJobData>(
    NOTIFICATIONS_QUEUE_NAME,
    async (job) => {
      try {
        await processNotificationJob(job);
        await prisma.notificationLog.update({
          where: { id: job.data.notificationLogId },
          data: { status: "SENT", attempts: job.attemptsMade + 1, lastError: null },
        });
      } catch (error) {
        const maxAttempts = job.opts.attempts ?? 1;
        const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;
        await prisma.notificationLog.update({
          where: { id: job.data.notificationLogId },
          data: {
            status: isFinalAttempt ? "FAILED" : "PENDING",
            attempts: job.attemptsMade + 1,
            lastError: error instanceof Error ? error.message : String(error),
          },
        });
        throw error; // let BullMQ's own retry/backoff policy take over
      }
    },
    { connection: redisConnection },
  );
}

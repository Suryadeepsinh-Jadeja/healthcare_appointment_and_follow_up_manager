export type NotificationType = "BOOKING_CONFIRM" | "REMINDER" | "CANCELLATION" | "RESCHEDULE" | "MED_REMINDER";
export type NotificationChannel = "EMAIL" | "CALENDAR";

/**
 * Flat, mostly-optional payload shared by every (type, channel) combination.
 * Which fields are populated depends on type+channel — see the switch in
 * jobs/notifications.worker.ts for exactly which fields each branch reads.
 */
export interface NotificationJobData {
  /** Primary key of the NotificationLog row this job updates on completion/failure. */
  notificationLogId: string;
  appointmentId: string;
  type: NotificationType;
  channel: NotificationChannel;

  // EMAIL: BOOKING_CONFIRM / REMINDER / CANCELLATION / RESCHEDULE
  patientEmail?: string;
  patientName?: string;
  doctorEmail?: string;
  doctorName?: string;
  specialisation?: string;
  slotStart?: string; // ISO
  reason?: string; // CANCELLATION only
  rebookUrl?: string; // CANCELLATION only
  previousSlotStart?: string; // ISO — RESCHEDULE only

  // EMAIL: MED_REMINDER
  drug?: string;
  dose?: string;
  timing?: string;

  // CALENDAR: BOOKING_CONFIRM / RESCHEDULE
  doctorUserId?: string;
  patientUserId?: string;
  slotEnd?: string; // ISO

  // CALENDAR: CANCELLATION / RESCHEDULE
  googleEventIdDoctor?: string | null;
  googleEventIdPatient?: string | null;
}

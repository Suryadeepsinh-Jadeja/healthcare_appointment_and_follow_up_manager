export interface RenderedEmail {
  subject: string;
  html: string;
}

interface AppointmentEmailContext {
  patientName: string;
  doctorName: string;
  specialisation: string;
  slotStart: Date;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" });
}

function wrapper(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="font-family: sans-serif; color: #0f172a; line-height: 1.5;">
    <h2>${title}</h2>
    ${bodyHtml}
    <p style="color: #64748b; font-size: 12px;">This is an automated message from your clinic's appointment system.</p>
  </body>
</html>`;
}

export function bookingConfirmationEmail(ctx: AppointmentEmailContext): RenderedEmail {
  return {
    subject: `Appointment confirmed with ${ctx.doctorName}`,
    html: wrapper(
      "Your appointment is confirmed",
      `<p>Hi ${ctx.patientName},</p>
       <p>Your appointment with <strong>${ctx.doctorName}</strong> (${ctx.specialisation}) is confirmed for
       <strong>${formatDateTime(ctx.slotStart)}</strong>.</p>`,
    ),
  };
}

export function appointmentReminderEmail(ctx: AppointmentEmailContext): RenderedEmail {
  return {
    subject: `Reminder: appointment with ${ctx.doctorName}`,
    html: wrapper(
      "Appointment reminder",
      `<p>Hi ${ctx.patientName},</p>
       <p>This is a reminder for your upcoming appointment with <strong>${ctx.doctorName}</strong>
       (${ctx.specialisation}) at <strong>${formatDateTime(ctx.slotStart)}</strong>.</p>`,
    ),
  };
}

export function cancellationEmail(
  ctx: AppointmentEmailContext & { rebookUrl: string; reason?: string },
): RenderedEmail {
  return {
    subject: `Your appointment with ${ctx.doctorName} was cancelled`,
    html: wrapper(
      "Appointment cancelled",
      `<p>Hi ${ctx.patientName},</p>
       <p>Your appointment with <strong>${ctx.doctorName}</strong> on
       <strong>${formatDateTime(ctx.slotStart)}</strong> has been cancelled${ctx.reason ? ` (${ctx.reason})` : ""}.</p>
       <p><a href="${ctx.rebookUrl}">Choose another slot with ${ctx.doctorName}</a></p>`,
    ),
  };
}

export function doctorBookingConfirmationEmail(ctx: AppointmentEmailContext): RenderedEmail {
  return {
    subject: `Appointment confirmed with ${ctx.patientName}`,
    html: wrapper(
      "New appointment confirmed",
      `<p>Hi Dr. ${ctx.doctorName},</p>
       <p>An appointment with <strong>${ctx.patientName}</strong> is confirmed for
       <strong>${formatDateTime(ctx.slotStart)}</strong>.</p>`,
    ),
  };
}

export function doctorAppointmentReminderEmail(ctx: AppointmentEmailContext): RenderedEmail {
  return {
    subject: `Reminder: appointment with ${ctx.patientName}`,
    html: wrapper(
      "Upcoming appointment reminder",
      `<p>Hi Dr. ${ctx.doctorName},</p>
       <p>This is a reminder for your upcoming appointment with <strong>${ctx.patientName}</strong>
       at <strong>${formatDateTime(ctx.slotStart)}</strong>.</p>`,
    ),
  };
}

export function doctorCancellationEmail(
  ctx: AppointmentEmailContext & { reason?: string },
): RenderedEmail {
  return {
    subject: `Appointment with ${ctx.patientName} was cancelled`,
    html: wrapper(
      "Appointment cancelled",
      `<p>Hi Dr. ${ctx.doctorName},</p>
       <p>The appointment with <strong>${ctx.patientName}</strong> on
       <strong>${formatDateTime(ctx.slotStart)}</strong> has been cancelled${ctx.reason ? ` (${ctx.reason})` : ""}.</p>`,
    ),
  };
}

export function patientRescheduledEmail(
  ctx: AppointmentEmailContext & { previousSlotStart: Date },
): RenderedEmail {
  return {
    subject: `Your appointment with ${ctx.doctorName} was rescheduled`,
    html: wrapper(
      "Appointment rescheduled",
      `<p>Hi ${ctx.patientName},</p>
       <p>Your appointment with <strong>${ctx.doctorName}</strong> (${ctx.specialisation}) has moved from
       <strong>${formatDateTime(ctx.previousSlotStart)}</strong> to
       <strong>${formatDateTime(ctx.slotStart)}</strong>.</p>`,
    ),
  };
}

export function doctorRescheduledEmail(
  ctx: AppointmentEmailContext & { previousSlotStart: Date },
): RenderedEmail {
  return {
    subject: `Appointment with ${ctx.patientName} was rescheduled`,
    html: wrapper(
      "Appointment rescheduled",
      `<p>Hi Dr. ${ctx.doctorName},</p>
       <p>The appointment with <strong>${ctx.patientName}</strong> has moved from
       <strong>${formatDateTime(ctx.previousSlotStart)}</strong> to
       <strong>${formatDateTime(ctx.slotStart)}</strong>.</p>`,
    ),
  };
}

export function medicationReminderEmail(ctx: {
  patientName: string;
  drug: string;
  dose: string;
  timing: string;
}): RenderedEmail {
  return {
    subject: `Medication reminder: ${ctx.drug}`,
    html: wrapper(
      "Time for your medication",
      `<p>Hi ${ctx.patientName},</p>
       <p>It's time to take <strong>${ctx.drug}</strong> (${ctx.dose}). Schedule: ${ctx.timing}.</p>`,
    ),
  };
}

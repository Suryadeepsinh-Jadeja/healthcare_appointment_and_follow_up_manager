import { describe, expect, it } from "vitest";
import {
  appointmentReminderEmail,
  bookingConfirmationEmail,
  cancellationEmail,
  medicationReminderEmail,
} from "../src/modules/notifications/email/templates";

const ctx = {
  patientName: "Asha Kulkarni",
  doctorName: "Dr. Arjun Mehta",
  specialisation: "Cardiology",
  slotStart: new Date("2027-03-01T09:00:00.000Z"),
};

describe("email templates", () => {
  it("renders a booking confirmation with patient, doctor, and time", () => {
    const email = bookingConfirmationEmail(ctx);
    expect(email.subject).toContain("Dr. Arjun Mehta");
    expect(email.html).toContain("Asha Kulkarni");
    expect(email.html).toContain("Cardiology");
  });

  it("renders a reminder email", () => {
    const email = appointmentReminderEmail(ctx);
    expect(email.subject).toContain("Reminder");
    expect(email.html).toContain("Dr. Arjun Mehta");
  });

  it("renders a cancellation email with a rebooking link and optional reason", () => {
    const email = cancellationEmail({ ...ctx, rebookUrl: "https://clinic.test/book/doc-1", reason: "doctor on leave" });
    expect(email.html).toContain("https://clinic.test/book/doc-1");
    expect(email.html).toContain("doctor on leave");
  });

  it("renders a medication reminder email", () => {
    const email = medicationReminderEmail({
      patientName: "Asha Kulkarni",
      drug: "Paracetamol",
      dose: "500mg",
      timing: "twice daily",
    });
    expect(email.subject).toContain("Paracetamol");
    expect(email.html).toContain("500mg");
    expect(email.html).toContain("twice daily");
  });
});

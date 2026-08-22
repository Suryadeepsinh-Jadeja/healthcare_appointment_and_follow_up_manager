import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { HttpError } from "../src/lib/errors";
import { holdAppointment } from "../src/modules/appointments/appointments.service";

/**
 * Exercises the real database's unique constraint under true concurrency —
 * this is deliberately not mocked, since the whole point is proving the DB
 * (not application logic) is what prevents the double-booking race. Requires
 * a running Postgres matching DATABASE_URL, with the seed data applied.
 */
describe("booking concurrency", () => {
  let patientAId: string;
  let patientBId: string;
  let doctorId: string;
  const slotStart = "2027-03-01T09:00:00.000Z"; // a Monday, within Dr. Mehta's working hours

  beforeAll(async () => {
    const doctorUser = await prisma.user.findUniqueOrThrow({
      where: { email: "dr.mehta@clinic.test" },
      include: { doctorProfile: true },
    });
    doctorId = doctorUser.doctorProfile!.id;

    const patientA = await prisma.user.findUniqueOrThrow({ where: { email: "asha.patient@clinic.test" } });
    const patientB = await prisma.user.findUniqueOrThrow({ where: { email: "rohan.patient@clinic.test" } });
    patientAId = patientA.id;
    patientBId = patientB.id;

    await prisma.appointment.deleteMany({ where: { doctorId, slotStart: new Date(slotStart) } });
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({ where: { doctorId, slotStart: new Date(slotStart) } });
    await prisma.$disconnect();
  });

  it("allows exactly one of two simultaneous holds for the same slot to succeed", async () => {
    const results = await Promise.allSettled([
      holdAppointment(patientAId, doctorId, slotStart),
      holdAppointment(patientBId, doctorId, slotStart),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const rejection = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejection).toBeInstanceOf(HttpError);
    expect((rejection as HttpError).status).toBe(409);

    const rows = await prisma.appointment.findMany({ where: { doctorId, slotStart: new Date(slotStart) } });
    expect(rows).toHaveLength(1);
  });
});

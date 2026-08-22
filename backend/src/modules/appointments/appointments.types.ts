import { z } from "zod";

export const holdAppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  slotStart: z.string().datetime(),
});

export const confirmAppointmentSchema = z.object({
  symptoms: z.string().min(1),
});

export const rescheduleAppointmentSchema = z.object({
  slotStart: z.string().datetime(),
});

export type HoldAppointmentInput = z.infer<typeof holdAppointmentSchema>;
export type ConfirmAppointmentInput = z.infer<typeof confirmAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

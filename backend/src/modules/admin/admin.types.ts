import { z } from "zod";

const workingHoursSchema = z.record(
  z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  z.array(z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/)),
);

export const createDoctorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  specialisation: z.string().min(1),
  slotDurationMin: z.number().int().positive().default(20),
  workingHours: workingHoursSchema,
});

export const updateDoctorSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  specialisation: z.string().min(1).optional(),
  slotDurationMin: z.number().int().positive().optional(),
  workingHours: workingHoursSchema.optional(),
  active: z.boolean().optional(),
});

export const createLeaveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format"),
  reason: z.string().optional(),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;

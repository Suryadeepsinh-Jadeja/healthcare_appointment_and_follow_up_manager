import { z } from "zod";

export const listDoctorsQuerySchema = z.object({
  specialisation: z.string().min(1).optional(),
});

export const doctorSlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format"),
});

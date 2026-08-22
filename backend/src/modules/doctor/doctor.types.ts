import { z } from "zod";

export const doctorAppointmentsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format").optional(),
});

export const submitNotesSchema = z.object({
  notes: z.string().min(1),
  prescription: z.array(
    z.object({
      drug: z.string().min(1),
      dose: z.string().min(1),
      timesPerDay: z.number().int().positive(),
      days: z.number().int().positive(),
    }),
  ),
});

export type SubmitNotesInput = z.infer<typeof submitNotesSchema>;

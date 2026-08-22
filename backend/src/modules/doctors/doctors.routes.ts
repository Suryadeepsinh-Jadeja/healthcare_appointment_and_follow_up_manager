import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { handleRouteError } from "../../lib/errors";
import * as doctorsService from "./doctors.service";
import { doctorSlotsQuerySchema, listDoctorsQuerySchema } from "./doctors.types";

export const doctorsRouter = Router();

doctorsRouter.get("/", requireAuth, requireRole(Role.PATIENT, Role.ADMIN), async (req, res) => {
  try {
    const { specialisation } = listDoctorsQuerySchema.parse(req.query);
    const doctors = await doctorsService.listDoctors(specialisation);
    res.json({ doctors });
  } catch (error) {
    handleRouteError(error, res);
  }
});

doctorsRouter.get("/:id/slots", requireAuth, requireRole(Role.PATIENT), async (req, res) => {
  try {
    const { date } = doctorSlotsQuerySchema.parse(req.query);
    const slots = await doctorsService.getDoctorSlots(req.params.id, date);
    res.json({ slots });
  } catch (error) {
    handleRouteError(error, res);
  }
});

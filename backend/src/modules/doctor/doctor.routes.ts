import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { handleRouteError } from "../../lib/errors";
import * as doctorService from "./doctor.service";
import { doctorAppointmentsQuerySchema, submitNotesSchema } from "./doctor.types";

export const doctorRouter = Router();

doctorRouter.use(requireAuth, requireRole(Role.DOCTOR));

doctorRouter.get("/appointments", async (req, res) => {
  try {
    const { date } = doctorAppointmentsQuerySchema.parse(req.query);
    const appointments = await doctorService.listDoctorAppointments(req.user!.id, date);
    res.status(200).json({ appointments });
  } catch (error) {
    handleRouteError(error, res);
  }
});

doctorRouter.get("/appointments/next", async (req, res) => {
  try {
    const appointment = await doctorService.getNextAppointment(req.user!.id);
    res.status(200).json({ appointment });
  } catch (error) {
    handleRouteError(error, res);
  }
});

doctorRouter.get("/appointments/:id", async (req, res) => {
  try {
    const appointment = await doctorService.getDoctorAppointment(req.user!.id, req.params.id);
    res.status(200).json({ appointment });
  } catch (error) {
    handleRouteError(error, res);
  }
});

doctorRouter.post("/appointments/:id/notes", async (req, res) => {
  try {
    const input = submitNotesSchema.parse(req.body);
    const appointment = await doctorService.submitVisitNotes(req.user!.id, req.params.id, input);
    res.status(200).json({ appointment });
  } catch (error) {
    handleRouteError(error, res);
  }
});

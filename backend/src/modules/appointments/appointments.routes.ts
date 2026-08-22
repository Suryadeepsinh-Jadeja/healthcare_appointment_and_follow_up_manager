import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { handleRouteError } from "../../lib/errors";
import * as appointmentsService from "./appointments.service";
import { confirmAppointmentSchema, holdAppointmentSchema } from "./appointments.types";

export const appointmentsRouter = Router();

appointmentsRouter.use(requireAuth, requireRole(Role.PATIENT));

appointmentsRouter.post("/hold", async (req, res) => {
  try {
    const input = holdAppointmentSchema.parse(req.body);
    const appointment = await appointmentsService.holdAppointment(req.user!.id, input.doctorId, input.slotStart);
    res.status(201).json({ appointment });
  } catch (error) {
    handleRouteError(error, res);
  }
});

appointmentsRouter.post("/:id/confirm", async (req, res) => {
  try {
    const input = confirmAppointmentSchema.parse(req.body);
    const appointment = await appointmentsService.confirmAppointment(req.user!.id, req.params.id, input.symptoms);
    res.status(200).json({ appointment });
  } catch (error) {
    handleRouteError(error, res);
  }
});

appointmentsRouter.delete("/:id", async (req, res) => {
  try {
    const appointment = await appointmentsService.cancelAppointment(req.user!.id, req.params.id);
    res.status(200).json({ appointment });
  } catch (error) {
    handleRouteError(error, res);
  }
});

appointmentsRouter.get("/me", async (req, res) => {
  try {
    const appointments = await appointmentsService.listMyAppointments(req.user!.id);
    res.status(200).json({ appointments });
  } catch (error) {
    handleRouteError(error, res);
  }
});

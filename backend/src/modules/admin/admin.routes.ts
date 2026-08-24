import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { handleRouteError } from "../../lib/errors";
import { listFailedNotifications } from "../notifications/notifications.service";
import * as adminService from "./admin.service";
import { createDoctorSchema, createLeaveSchema, updateDoctorSchema } from "./admin.types";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(Role.ADMIN));

adminRouter.post("/doctors", async (req, res) => {
  try {
    const input = createDoctorSchema.parse(req.body);
    const doctor = await adminService.createDoctor(input);
    res.status(201).json({ doctor });
  } catch (error) {
    handleRouteError(error, res);
  }
});

adminRouter.patch("/doctors/:id", async (req, res) => {
  try {
    const input = updateDoctorSchema.parse(req.body);
    const doctor = await adminService.updateDoctor(req.params.id, input);
    res.status(200).json({ doctor });
  } catch (error) {
    handleRouteError(error, res);
  }
});

adminRouter.delete("/doctors/:id", async (req, res) => {
  try {
    const result = await adminService.deactivateDoctor(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    handleRouteError(error, res);
  }
});

adminRouter.post("/doctors/:id/leave", async (req, res) => {
  try {
    const input = createLeaveSchema.parse(req.body);
    const result = await adminService.createDoctorLeave(req.params.id, input.date, input.reason);
    res.status(201).json(result);
  } catch (error) {
    handleRouteError(error, res);
  }
});

adminRouter.get("/notifications/failed", async (_req, res) => {
  try {
    const notifications = await listFailedNotifications();
    res.status(200).json({ notifications });
  } catch (error) {
    handleRouteError(error, res);
  }
});

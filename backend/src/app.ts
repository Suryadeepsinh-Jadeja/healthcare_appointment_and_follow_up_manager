import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.routes";
import { doctorsRouter } from "./modules/doctors/doctors.routes";
import { appointmentsRouter } from "./modules/appointments/appointments.routes";
import { googleRouter } from "./modules/calendar/google.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { doctorRouter } from "./modules/doctor/doctor.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use("/doctors", doctorsRouter);
  app.use("/appointments", appointmentsRouter);
  app.use("/google", googleRouter);
  app.use("/admin", adminRouter);
  app.use("/doctor", doctorRouter);

  return app;
}

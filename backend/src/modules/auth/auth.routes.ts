import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { prisma } from "../../lib/prisma";
import * as authService from "./auth.service";
import { loginSchema, refreshSchema, registerSchema } from "./auth.types";

export const authRouter = Router();

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, role: true, phone: true },
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ user });
});

authRouter.post("/register", async (req, res) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  } catch (error) {
    handleAuthError(error, res);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.status(200).json(result);
  } catch (error) {
    handleAuthError(error, res);
  }
});

authRouter.post("/refresh", async (req, res) => {
  try {
    const input = refreshSchema.parse(req.body);
    const result = await authService.refresh(input.refreshToken);
    res.status(200).json(result);
  } catch (error) {
    handleAuthError(error, res);
  }
});

function handleAuthError(error: unknown, res: import("express").Response) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: "Invalid request", details: error.flatten() });
  }
  if (error instanceof authService.AuthError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(error);
  return res.status(500).json({ error: "Internal server error" });
}

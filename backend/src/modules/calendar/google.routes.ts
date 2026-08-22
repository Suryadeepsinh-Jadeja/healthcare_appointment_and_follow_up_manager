import { Router } from "express";
import { env } from "../../config/env";
import { requireAuth } from "../../middleware/auth.middleware";
import { signOAuthState, verifyOAuthState } from "../../lib/jwt";
import { createOAuthClient, GOOGLE_CALENDAR_SCOPE } from "./google.client";
import { saveGoogleAuthFromCode } from "./calendar.service";

export const googleRouter = Router();

googleRouter.get("/auth-url", requireAuth, (req, res) => {
  const oauthClient = createOAuthClient();
  const state = signOAuthState(req.user!.id);

  const url = oauthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GOOGLE_CALENDAR_SCOPE],
    state,
  });

  res.json({ url });
});

googleRouter.get("/callback", async (req, res) => {
  const { code, state } = req.query;

  if (typeof code !== "string" || typeof state !== "string") {
    return res.redirect(`${env.frontendUrl}/settings?googleCalendar=error`);
  }

  try {
    const userId = verifyOAuthState(state);
    await saveGoogleAuthFromCode(userId, code);
    res.redirect(`${env.frontendUrl}/settings?googleCalendar=connected`);
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    res.redirect(`${env.frontendUrl}/settings?googleCalendar=error`);
  }
});

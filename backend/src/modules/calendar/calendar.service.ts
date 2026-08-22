import { google } from "googleapis";
import { prisma } from "../../lib/prisma";
import { decrypt, encrypt } from "../../lib/crypto";
import { createOAuthClient } from "./google.client";

export async function saveGoogleAuthFromCode(userId: string, code: string): Promise<void> {
  const oauthClient = createOAuthClient();
  const { tokens } = await oauthClient.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token — reconnect and grant consent again");
  }

  await prisma.googleAuth.upsert({
    where: { userId },
    create: {
      userId,
      refreshToken: encrypt(tokens.refresh_token),
      accessToken: tokens.access_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    },
    update: {
      refreshToken: encrypt(tokens.refresh_token),
      accessToken: tokens.access_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    },
  });
}

async function getAuthorizedClientForUser(userId: string) {
  const googleAuth = await prisma.googleAuth.findUnique({ where: { userId } });
  if (!googleAuth) {
    return null;
  }

  const oauthClient = createOAuthClient();
  oauthClient.setCredentials({ refresh_token: decrypt(googleAuth.refreshToken) });
  return oauthClient;
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
}

/** Returns null (and does nothing) if the user hasn't connected Google Calendar — never throws for that case. */
export async function createCalendarEventForUser(
  userId: string,
  input: CalendarEventInput,
): Promise<string | null> {
  const auth = await getAuthorizedClientForUser(userId);
  if (!auth) {
    return null;
  }

  const calendar = google.calendar({ version: "v3", auth });
  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.start.toISOString() },
      end: { dateTime: input.end.toISOString() },
    },
  });

  return response.data.id ?? null;
}

export async function updateCalendarEventForUser(
  userId: string,
  eventId: string,
  input: CalendarEventInput,
): Promise<void> {
  const auth = await getAuthorizedClientForUser(userId);
  if (!auth) {
    return;
  }

  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.start.toISOString() },
      end: { dateTime: input.end.toISOString() },
    },
  });
}

export async function deleteCalendarEventForUser(userId: string, eventId: string): Promise<void> {
  const auth = await getAuthorizedClientForUser(userId);
  if (!auth) {
    return;
  }

  const calendar = google.calendar({ version: "v3", auth });
  try {
    await calendar.events.delete({ calendarId: "primary", eventId });
  } catch (error) {
    const status = error instanceof Error && "status" in error ? (error as { status?: number }).status : undefined;
    if (status === 404 || status === 410) {
      return; // already gone — nothing to clean up
    }
    throw error;
  }
}

import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "@prisma/client";

export interface TokenPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessTtl } as jwt.SignOptions);
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshTtl } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as TokenPayload;
}

const OAUTH_STATE_PURPOSE = "google-oauth-state";

interface OAuthStatePayload {
  sub: string;
  purpose: typeof OAUTH_STATE_PURPOSE;
}

/**
 * Signs a short-lived token carrying the initiating user's id, passed as the
 * OAuth `state` param. The callback has no Authorization header (Google
 * redirects the bare browser there), so this is how it learns which user to
 * attach the Google account to, while also guarding against CSRF.
 */
export function signOAuthState(userId: string): string {
  const payload: OAuthStatePayload = { sub: userId, purpose: OAUTH_STATE_PURPOSE };
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: "10m" });
}

export function verifyOAuthState(token: string): string {
  const payload = jwt.verify(token, env.jwtAccessSecret) as OAuthStatePayload;
  if (payload.purpose !== OAUTH_STATE_PURPOSE) {
    throw new Error("Invalid OAuth state token");
  }
  return payload.sub;
}

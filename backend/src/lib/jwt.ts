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

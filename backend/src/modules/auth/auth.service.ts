import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/errors";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt";
import { LoginInput, RegisterInput } from "./auth.types";

const SALT_ROUNDS = 10;

function issueTokens(user: { id: string; role: Role }) {
  const payload = { sub: user.id, role: user.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new HttpError("An account with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: Role.PATIENT,
      name: input.name,
      phone: input.phone,
      patientProfile: {
        create: {
          dob: input.dob ? new Date(input.dob) : undefined,
        },
      },
    },
  });

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    ...issueTokens(user),
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new HttpError("Invalid email or password", 401);
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new HttpError("Invalid email or password", 401);
  }

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    ...issueTokens(user),
  };
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError("Invalid or expired refresh token", 401);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new HttpError("Invalid or expired refresh token", 401);
  }

  return issueTokens(user);
}

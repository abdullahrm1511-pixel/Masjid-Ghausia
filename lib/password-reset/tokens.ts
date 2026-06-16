import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt }
  });

  return token;
}

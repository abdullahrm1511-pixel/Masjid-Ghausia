"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/password-reset/tokens";

export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8 || password !== confirmPassword) {
    redirect(`/reset-password/${token}?error=Controleer het wachtwoord`);
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) }
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    redirect(`/reset-password/${token}?error=Deze link is ongeldig of verlopen`);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hash(password, 12) }
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    })
  ]);

  redirect("/login");
}

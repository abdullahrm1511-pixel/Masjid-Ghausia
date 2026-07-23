"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/password-reset/tokens";

function validPassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!validPassword(password)) {
    redirect(`/reset-password/${token}?error=Gebruik minimaal 8 tekens, 1 hoofdletter, 1 kleine letter en 1 speciaal teken`);
  }

  if (password !== confirmPassword) {
    redirect(`/reset-password/${token}?error=Wachtwoorden komen niet overeen`);
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

  redirect("/login?reset=1");
}

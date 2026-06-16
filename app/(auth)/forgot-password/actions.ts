"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/password-reset/tokens";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = await createPasswordResetToken(user.id);
    redirect(`/forgot-password?sent=1&devToken=${token}`);
  }

  redirect("/forgot-password?sent=1");
}

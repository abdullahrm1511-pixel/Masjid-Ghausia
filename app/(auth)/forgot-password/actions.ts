"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/password-reset/tokens";
import { prepareEmailLog } from "@/lib/email/templates";
import { absoluteUrl } from "@/lib/seo";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, isActive: true }
  });

  if (user?.isActive) {
    const token = await createPasswordResetToken(user.id);
    const resetLink = absoluteUrl(`/reset-password/${token}`);

    await prepareEmailLog({
      templateKey: "PASSWORD_RESET",
      recipient: user.email,
      data: {
        naam: user.name || "donateur",
        reset_link: resetLink,
        organisatie: "St. GBC Masjid Ghausia"
      },
      entityType: "PasswordResetToken",
      entityId: user.id
    });
  }

  redirect("/forgot-password?sent=1");
}

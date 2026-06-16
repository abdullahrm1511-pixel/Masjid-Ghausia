"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageDonors } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EMAIL_TEMPLATES, EMAIL_PLACEHOLDERS, type EmailTemplateKey } from "@/lib/email/defaults";
import { resetEmailTemplate } from "@/lib/email/templates";

async function requireAdmin() {
  const session = await auth();
  if (!canManageDonors(session?.user.role)) throw new Error("Geen toegang");
}

function assertTemplateKey(key: string): asserts key is EmailTemplateKey {
  if (!DEFAULT_EMAIL_TEMPLATES.some((template) => template.key === key)) {
    throw new Error("Onbekende template");
  }
}

function textToHtml(input: string) {
  return input
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

export async function updateEmailTemplate(formData: FormData) {
  await requireAdmin();
  const key = String(formData.get("key") ?? "");
  assertTemplateKey(key);
  const subject = String(formData.get("subject") ?? "").trim();
  const bodyText = String(formData.get("bodyText") ?? "").trim();

  await prisma.emailTemplate.update({
    where: { key },
    data: {
      subject,
      bodyText,
      bodyHtml: textToHtml(bodyText),
      availablePlaceholders: [...EMAIL_PLACEHOLDERS]
    }
  });

  revalidatePath("/admin/email-templates");
  revalidatePath(`/admin/email-templates/${key}`);
  redirect(`/admin/email-templates/${key}?saved=1`);
}

export async function resetTemplateToDefault(formData: FormData) {
  await requireAdmin();
  const key = String(formData.get("key") ?? "");
  assertTemplateKey(key);
  await resetEmailTemplate(key);
  revalidatePath("/admin/email-templates");
  revalidatePath(`/admin/email-templates/${key}`);
  redirect(`/admin/email-templates/${key}?reset=1`);
}

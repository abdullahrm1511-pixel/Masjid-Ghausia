"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { formatCurrency } from "@/lib/display";
import { DEFAULT_EMAIL_TEMPLATES, type EmailTemplateKey } from "@/lib/email/defaults";
import { prepareEmailLog } from "@/lib/email/templates";
import { canManageDonors } from "@/lib/permissions";
import { isNearlyEighteen } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!canManageDonors(session?.user.role)) throw new Error("Geen toegang");
  return session.user.id;
}

function assertTemplateKey(key: string): asserts key is EmailTemplateKey {
  if (!DEFAULT_EMAIL_TEMPLATES.some((template) => template.key === key)) {
    throw new Error("Onbekende template");
  }
}

function visibleEmail(email: string) {
  return !(email.startsWith("legacy+") && email.endsWith("@stgbc.local"));
}

export async function sendBatchEmail(formData: FormData) {
  const adminId = await requireAdmin();
  const templateKey = String(formData.get("templateKey") ?? "");
  const selectedIds = formData.getAll("donorId").map(String).filter(Boolean);
  const confirmed = String(formData.get("confirmed") ?? "") === "yes";
  const returnTo = String(formData.get("returnTo") ?? "/admin/email-send");
  const path = returnTo.startsWith("/admin/email-send") ? returnTo : "/admin/email-send";

  assertTemplateKey(templateKey);
  if (!selectedIds.length) redirect(`${path}${path.includes("?") ? "&" : "?"}error=Selecteer+minimaal+een+ontvanger`);
  if (!confirmed) redirect(`${path}${path.includes("?") ? "&" : "?"}error=Vink+eerst+de+bevestiging+aan`);

  const donors = await prisma.donorProfile.findMany({
    where: { id: { in: selectedIds } },
    include: { user: true, paymentObligations: true, familyMembers: true }
  });

  const recipients = donors.filter((donor) => visibleEmail(donor.user.email));
  if (!recipients.length) redirect(`${path}${path.includes("?") ? "&" : "?"}error=Geen+geldige+e-mailadressen+gevonden`);

  const siteUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  for (const donor of recipients) {
    const openAmountCents = donor.paymentObligations
      .filter((item) => item.status === "DUE" && item.amountCents > 0)
      .reduce((sum, item) => sum + item.amountCents, 0);
    const paidAmountCents = donor.paymentObligations
      .filter((item) => item.status === "PAID" && item.amountCents > 0)
      .reduce((sum, item) => sum + item.amountCents, 0);
    const nearlyEighteenChild = donor.familyMembers.find((member) => member.type === "CHILD" && member.isActive && isNearlyEighteen(member.dateOfBirth));

    await prepareEmailLog({
      templateKey,
      recipient: donor.user.email,
      entityType: "DonorProfile",
      entityId: donor.id,
      data: {
        naam: `${donor.firstName} ${donor.lastName}`.trim(),
        voornaam: donor.firstName,
        achternaam: donor.lastName,
        registratienummer: donor.registrationNumber ?? "",
        status: donor.status,
        bedrag: formatCurrency(openAmountCents),
        jaarlijks_bedrag: formatCurrency(openAmountCents),
        eenmalig_bedrag: formatCurrency(openAmountCents),
        donatie_bedrag: formatCurrency(openAmountCents),
        betaaldatum: "",
        reden: "",
        correctiebericht: "",
        boete: "",
        contact_email: "info@stgbc.masjidghausia.nl",
        rekeningnummer: "NL72ABNA0808763342",
        kind_naam: nearlyEighteenChild ? `${nearlyEighteenChild.firstName} ${nearlyEighteenChild.lastName}`.trim() : "uw kind",
        loginlink: templateKey === "ADULT_CHILD_REMINDER" ? `${siteUrl}/register` : `${siteUrl}/login`,
        organisatie: "St. GBC Masjid Ghausia",
        verification_link: "",
        verification_code: "",
        reset_link: "",
        betaald: formatCurrency(paidAmountCents)
      }
    });
  }

  await writeAuditLog({
    actorId: adminId,
    action: "CREATE",
    entityType: "EmailLog",
    message: `Batch e-mail verstuurd: ${templateKey}`,
    metadata: {
      templateKey,
      requestedCount: selectedIds.length,
      sentCount: recipients.length
    }
  });

  revalidatePath("/admin/email-log");
  redirect(`/admin/email-send?sent=${recipients.length}`);
}

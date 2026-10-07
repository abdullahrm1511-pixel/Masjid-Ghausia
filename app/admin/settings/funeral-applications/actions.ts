"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canManageDonors } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createFuneralAccessToken } from "@/lib/funeral-application";
import type { FuneralFormData } from "@/lib/funeral-application";
import { writeAuditLog } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user.id || !canManageDonors(session.user.role)) throw new Error("Geen toegang");
  return session.user.id;
}

export async function createFuneralApplication() {
  const adminId = await requireAdmin();
  const application = await prisma.funeralApplication.create({ data: { accessToken: createFuneralAccessToken(), createdById: adminId } });
  await writeAuditLog({ actorId: adminId, action: "CREATE", entityType: "FuneralApplication", entityId: application.id, message: "Begrafenisaanvraag-link aangemaakt" });
  redirect(`/admin/settings/funeral-applications/${application.id}`);
}

export async function deleteFuneralApplication(formData: FormData) {
  const adminId = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.funeralApplication.delete({ where: { id } });
  await writeAuditLog({ actorId: adminId, action: "DELETE", entityType: "FuneralApplication", entityId: id, message: "Begrafenisaanvraag verwijderd" });
  redirect("/admin/settings/funeral-applications");
}

export async function updateFuneralPdfDetails(formData: FormData) {
  const adminId = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const application = await prisma.funeralApplication.findUnique({ where: { id }, select: { formData: true } });
  if (!application?.formData) throw new Error("Aanvraag niet gevonden of nog niet ingevuld");

  const currentData = application.formData as FuneralFormData;
  const funeralDate = String(formData.get("funeralDate") ?? "").trim();
  const funeralTime = String(formData.get("funeralTime") ?? "").trim();
  const coffinRegistrationNumber = String(formData.get("coffinRegistrationNumber") ?? "").trim();

  await prisma.funeralApplication.update({
    where: { id },
    data: { formData: { ...currentData, funeralDate, funeralTime, coffinRegistrationNumber } }
  });
  await writeAuditLog({
    actorId: adminId,
    action: "UPDATE",
    entityType: "FuneralApplication",
    entityId: id,
    message: "PDF-gegevens begrafenis bijgewerkt"
  });
  revalidatePath(`/admin/settings/funeral-applications/${id}`);
  redirect(`/admin/settings/funeral-applications/${id}?pdfDetails=saved`);
}

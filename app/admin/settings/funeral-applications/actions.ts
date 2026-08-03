"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageDonors } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createFuneralAccessToken } from "@/lib/funeral-application";
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

import type { DonorStatus, Prisma, PrismaClient } from "@prisma/client";

type DbClient = Prisma.TransactionClient | PrismaClient;

export async function syncFamilyActivityForDonorStatus(db: DbClient, donorProfileId: string, status: DonorStatus | string) {
  if (status === "REJECTED" || status === "DECEASED") {
    await db.familyMember.updateMany({
      where: { donorProfileId },
      data: { isActive: false }
    });
    return;
  }

  if (status === "ACTIVE") {
    await db.familyMember.updateMany({
      where: {
        donorProfileId,
        status: { in: ["ACTIVE_DEPENDENT", "UNDER_18"] }
      },
      data: { isActive: true }
    });
  }
}

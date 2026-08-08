const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  if (process.env.CONFIRM_DATABASE_RESET !== "yes") {
    throw new Error("Set CONFIRM_DATABASE_RESET=yes om de database-reset uit te voeren.");
  }

  const preserveEmail = String(process.env.PRESERVE_USER_EMAIL || "").trim().toLowerCase();
  if (!preserveEmail) {
    throw new Error("Set PRESERVE_USER_EMAIL op het e-mailadres van het account dat behouden moet blijven.");
  }
  const preservedUser = await prisma.user.findFirst({ where: { email: { equals: preserveEmail, mode: "insensitive" } }, select: { id: true, email: true, role: true } });
  if (!preservedUser) {
    throw new Error(`Reset gestopt: gebruiker ${preserveEmail} bestaat niet.`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.donationPayment.deleteMany({});
    await tx.surveyResponse.deleteMany({});
    await tx.survey.deleteMany({});
    await tx.funeralApplicationDocument.deleteMany({});
    await tx.funeralApplication.deleteMany({});
    await tx.legacyImportArchive.deleteMany({});
    await tx.emailLog.deleteMany({});
    await tx.auditLog.deleteMany({});
    await tx.passwordResetToken.deleteMany({});
    await tx.membershipChangeRequest.deleteMany({});
    await tx.paymentObligation.deleteMany({});
    await tx.changeRequest.deleteMany({});
    await tx.registrationRequest.deleteMany({});
    await tx.adultChildTransition.deleteMany({});
    await tx.familyMemberStatusHistory.deleteMany({});
    await tx.identityDocument.deleteMany({});
    await tx.familyMember.deleteMany({});
    await tx.membershipMember.deleteMany({});
    await tx.donorStatusHistory.deleteMany({});
    await tx.membership.deleteMany({});
    await tx.donorProfile.deleteMany({});
    await tx.user.deleteMany({ where: { id: { not: preservedUser.id } } });
    await tx.registrationCounter.upsert({
      where: { prefix: "11" },
      update: { current: 0 },
      create: { prefix: "11", current: 0 }
    });
  });

  const counter = await prisma.registrationCounter.findUnique({ where: { prefix: "11" }, select: { current: true } });
  const userCount = await prisma.user.count();
  const donorCount = await prisma.donorProfile.count();
  console.log(`Database reset klaar. Behouden account: ${preservedUser.email} (${preservedUser.role}). Gebruikers: ${userCount}. Donateurs: ${donorCount}. Lidnummer-teller: ${counter?.current ?? 0}.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

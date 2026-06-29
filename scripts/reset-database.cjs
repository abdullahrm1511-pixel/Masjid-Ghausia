const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  if (process.env.CONFIRM_DATABASE_RESET !== "yes") {
    throw new Error("Set CONFIRM_DATABASE_RESET=yes om de database-reset uit te voeren.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.emailLog.deleteMany({});
    await tx.auditLog.deleteMany({});
    await tx.passwordResetToken.deleteMany({});
    await tx.membershipChangeRequest.deleteMany({});
    await tx.paymentObligation.deleteMany({});
    await tx.changeRequest.deleteMany({});
    await tx.registrationRequest.deleteMany({});
    await tx.adultChildTransition.deleteMany({});
    await tx.familyMemberStatusHistory.deleteMany({});
    await tx.familyMember.deleteMany({});
    await tx.membershipMember.deleteMany({});
    await tx.donorStatusHistory.deleteMany({});
    await tx.membership.deleteMany({});
    await tx.donorProfile.deleteMany({});
    await tx.user.deleteMany({ where: { role: "DONOR" } });
    await tx.registrationCounter.upsert({
      where: { prefix: "11" },
      update: { current: 0 },
      create: { prefix: "11", current: 0 }
    });
  });

  const counter = await prisma.registrationCounter.findUnique({
    where: { prefix: "11" },
    select: { current: true }
  });
  const donorCount = await prisma.donorProfile.count();

  console.log(`Database reset klaar. Donateurs: ${donorCount}. Lidnummer-teller: ${counter?.current ?? 0}. Volgende lidnummer: 11-00001.`);
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

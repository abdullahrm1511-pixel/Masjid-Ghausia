const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  if (process.env.CONFIRM_COUNTER_RESET !== "yes") {
    throw new Error("Set CONFIRM_COUNTER_RESET=yes om alleen de lidnummer-teller te resetten.");
  }

  const existingDonor = await prisma.donorProfile.findFirst({
    where: { registrationNumber: { not: null } },
    select: { registrationNumber: true }
  });

  if (existingDonor?.registrationNumber) {
    throw new Error(
      `Teller niet gereset: er bestaat nog lidnummer ${existingDonor.registrationNumber}. Verwijder geen data automatisch; voorkom dubbele lidnummers.`
    );
  }

  await prisma.registrationCounter.upsert({
    where: { prefix: "11" },
    update: { current: 0 },
    create: { prefix: "11", current: 0 }
  });

  console.log("Lidnummer-teller reset klaar. Volgende lidnummer: 11-00001. Verder is niets aangepast.");
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

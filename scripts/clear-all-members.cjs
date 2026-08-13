const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function counts() {
  const [donorUsers, donors, memberships, familyMembers, registrations, surveyDonors, surveyResponses, surveys, admins] = await Promise.all([
    prisma.user.count({ where: { role: "DONOR" } }),
    prisma.donorProfile.count(),
    prisma.membership.count(),
    prisma.familyMember.count(),
    prisma.registrationRequest.count(),
    prisma.surveyDonor.count(),
    prisma.surveyResponse.count(),
    prisma.survey.count(),
    prisma.user.count({ where: { role: { not: "DONOR" } } })
  ]);
  return { donorUsers, donors, memberships, familyMembers, registrations, surveyDonors, surveyResponses, surveys, admins };
}

async function main() {
  const before = await counts();
  console.log("Te verwijderen ledengegevens:", before);
  console.log(`Te bewaren: ${before.admins} beheerder(s) en ${before.surveys} donatieformulier(en).`);

  if (process.env.CONFIRM_CLEAR_ALL_MEMBERS !== "yes") {
    console.log('Controlemodus: niets verwijderd. Zet CONFIRM_CLEAR_ALL_MEMBERS="yes" om definitief uit te voeren.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Donatieformulieren en instellingen blijven bestaan; alleen alle inzendingen en personen gaan weg.
    await tx.donationPayment.deleteMany({});
    await tx.monthlyDonationPayment.deleteMany({});
    await tx.surveyResponseDocument.deleteMany({});
    await tx.surveyResponse.deleteMany({});
    await tx.surveyMemberRequest.deleteMany({});
    await tx.surveyMemberAccess.deleteMany({});
    await tx.surveyDonor.deleteMany({});

    // Alle STGBC-leden, aanvragen, gezinnen, lidmaatschappen en financiële ledenhistorie.
    await tx.membershipChangeRequest.deleteMany({});
    await tx.changeRequest.deleteMany({});
    await tx.registrationRequest.deleteMany({});
    await tx.paymentObligation.deleteMany({});
    await tx.adultChildTransition.deleteMany({});
    await tx.familyMemberStatusHistory.deleteMany({});
    await tx.identityDocument.deleteMany({});
    await tx.membershipMember.deleteMany({});
    await tx.familyMember.deleteMany({});
    await tx.donorStatusHistory.deleteMany({});
    await tx.donorProfile.updateMany({ data: { currentMembershipId: null } });
    await tx.membership.deleteMany({});
    await tx.donorProfile.deleteMany({});

    // Verwijder gewone ledenaccounts en hun sessies/tokens via cascades; beheerders blijven staan.
    await tx.user.deleteMany({ where: { role: "DONOR" } });

    // Oude importbestanden bevatten persoonsgegevens en horen niet in een schone start thuis.
    await tx.legacyImportArchive.deleteMany({});
    await tx.registrationCounter.upsert({
      where: { prefix: "11" },
      update: { current: 0 },
      create: { prefix: "11", current: 0 }
    });
  }, { timeout: 120000 });

  const after = await counts();
  const remainingMemberData = after.donorUsers + after.donors + after.memberships + after.familyMembers + after.registrations + after.surveyDonors + after.surveyResponses;
  if (remainingMemberData !== 0) throw new Error(`Opschoning niet volledig: nog ${remainingMemberData} ledenrecords gevonden.`);
  console.log("Opschoning voltooid:", after);
  console.log("Beheerders, formulieren, functies, instellingen, e-mailsjablonen en begrafenisaanvragen zijn bewaard.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

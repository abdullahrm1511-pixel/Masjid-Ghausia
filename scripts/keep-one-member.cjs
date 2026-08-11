const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const preservedEmail = String(process.env.PRESERVE_MEMBER_EMAIL || "sgbc16@gmail.com").trim().toLowerCase();
const adminEmail = "admin@stgbc.local";

async function main() {
  const preservedUser = await prisma.user.findUnique({
    where: { email: preservedEmail },
    include: {
      donorProfile: {
        include: {
          primaryMemberships: { select: { id: true } },
          payerMemberships: { select: { id: true } }
        }
      }
    }
  });

  if (!preservedUser?.donorProfile) {
    throw new Error(`Stopgezet: ${preservedEmail} bestaat niet als volledig ledenaccount. Er is niets verwijderd.`);
  }

  const before = {
    users: await prisma.user.count(),
    donors: await prisma.donorProfile.count(),
    preservedRegistrationNumber: preservedUser.donorProfile.registrationNumber
  };

  if (process.env.CONFIRM_KEEP_ONE_MEMBER !== "yes") {
    console.log("Controle geslaagd; er is nog niets verwijderd.");
    console.log(`Te bewaren lid: ${preservedEmail} (${before.preservedRegistrationNumber || "zonder lidnummer"}).`);
    console.log(`Te bewaren/toe te voegen beheerder: ${adminEmail}.`);
    console.log(`Huidige aantallen: ${before.users} gebruikers en ${before.donors} leden.`);
    console.log('Zet CONFIRM_KEEP_ONE_MEMBER="yes" om de opschoning definitief uit te voeren.');
    return;
  }

  const keepMembershipIds = new Set([
    preservedUser.donorProfile.currentMembershipId,
    ...preservedUser.donorProfile.primaryMemberships.map((membership) => membership.id),
    ...preservedUser.donorProfile.payerMemberships.map((membership) => membership.id)
  ].filter(Boolean));
  const passwordHash = await bcrypt.hash("Admin123!", 12);
  const registrationMatch = preservedUser.donorProfile.registrationNumber?.match(/^(?:11-)?(\d+)$/);
  const counterValue = registrationMatch ? Number(registrationMatch[1]) : 0;

  await prisma.$transaction(async (tx) => {
    await tx.membership.deleteMany({ where: keepMembershipIds.size ? { id: { notIn: [...keepMembershipIds] } } : {} });
    await tx.donorProfile.deleteMany({ where: { id: { not: preservedUser.donorProfile.id } } });
    await tx.user.deleteMany({ where: { email: { notIn: [preservedEmail, adminEmail] } } });

    await tx.user.upsert({
      where: { email: adminEmail },
      update: { name: "St. GBC Admin", passwordHash, role: "SUPER_ADMIN", isActive: true },
      create: { name: "St. GBC Admin", email: adminEmail, passwordHash, role: "SUPER_ADMIN", isActive: true }
    });
    const admin = await tx.user.findUniqueOrThrow({ where: { email: adminEmail } });
    await tx.adminProfile.upsert({
      where: { userId: admin.id },
      update: { displayName: "St. GBC Admin", twoFactorRequired: false },
      create: { userId: admin.id, displayName: "St. GBC Admin", twoFactorRequired: false, twoFactorEnabled: false }
    });
    await tx.registrationCounter.upsert({
      where: { prefix: "11" },
      update: { current: counterValue },
      create: { prefix: "11", current: counterValue }
    });
  }, { timeout: 120000 });

  const after = { users: await prisma.user.count(), donors: await prisma.donorProfile.count() };
  if (after.donors !== 1) throw new Error(`Controlefout: verwacht 1 lid, maar vond ${after.donors}.`);
  console.log(`Klaar. Bewaard lid: ${preservedEmail}. Beheerder: ${adminEmail}. Gebruikers: ${after.users}. Leden: ${after.donors}.`);
  console.log("Tijdelijk beheerderswachtwoord: Admin123! Wijzig dit direct na het inloggen.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

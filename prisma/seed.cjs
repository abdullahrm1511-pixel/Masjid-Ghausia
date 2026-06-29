const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin123!", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@stgbc.local" },
    update: {
      name: "St. GBC Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true
    },
    create: {
      name: "St. GBC Admin",
      email: "admin@stgbc.local",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true
    }
  });

  await prisma.adminProfile.upsert({
    where: { userId: user.id },
    update: { displayName: "St. GBC Admin" },
    create: {
      userId: user.id,
      displayName: "St. GBC Admin",
      twoFactorRequired: true,
      twoFactorEnabled: false
    }
  });

  const registrationAdminPasswordHash = await bcrypt.hash("Registratie123!", 12);
  const registrationAdmin = await prisma.user.upsert({
    where: { email: "registraties@stgbc.local" },
    update: {
      name: "St. GBC Registratiebeheer",
      passwordHash: registrationAdminPasswordHash,
      role: "REGISTRATION_ADMIN",
      isActive: true
    },
    create: {
      name: "St. GBC Registratiebeheer",
      email: "registraties@stgbc.local",
      passwordHash: registrationAdminPasswordHash,
      role: "REGISTRATION_ADMIN",
      isActive: true
    }
  });

  await prisma.adminProfile.upsert({
    where: { userId: registrationAdmin.id },
    update: { displayName: "St. GBC Registratiebeheer" },
    create: {
      userId: registrationAdmin.id,
      displayName: "St. GBC Registratiebeheer",
      twoFactorRequired: false,
      twoFactorEnabled: false
    }
  });

  await prisma.registrationCounter.upsert({
    where: { prefix: "11" },
    update: { current: 0 },
    create: { prefix: "11", current: 0 }
  });
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

import { prisma } from "@/lib/prisma";
import { formatRegistrationNumber, REGISTRATION_NUMBER_PREFIX, registrationSequence } from "@/lib/constants";

export async function generateRegistrationNumber() {
  const [donorNumbers, membershipNumbers, existing] = await Promise.all([
    prisma.donorProfile.findMany({
      where: { registrationNumber: { not: null } },
      select: { registrationNumber: true }
    }),
    prisma.membership.findMany({
      select: { registrationNumber: true }
    }),
    prisma.registrationCounter.findUnique({
      where: { prefix: REGISTRATION_NUMBER_PREFIX }
    })
  ]);
  const highestExisting = [...donorNumbers, ...membershipNumbers]
    .map((item) => registrationSequence(item.registrationNumber ?? ""))
    .filter((value): value is number => value !== null)
    .reduce((max, value) => Math.max(max, value), 0);
  const current = Math.max(existing?.current ?? 0, highestExisting);

  const counter = await prisma.registrationCounter.upsert({
    where: { prefix: REGISTRATION_NUMBER_PREFIX },
    update: { current: { increment: 1 } },
    create: { prefix: REGISTRATION_NUMBER_PREFIX, current: current + 1 }
  });

  if (counter.current > current) {
    return formatRegistrationNumber(counter.current);
  }

  const syncedCounter = await prisma.registrationCounter.update({
    where: { prefix: REGISTRATION_NUMBER_PREFIX },
    data: { current: current + 1 }
  });

  return formatRegistrationNumber(syncedCounter.current);
}

export async function syncRegistrationCounter(importedNumbers: string[]) {
  const highest = importedNumbers
    .map(registrationSequence)
    .filter((value): value is number => value !== null)
    .reduce((max, value) => Math.max(max, value), 0);

  if (highest === 0) {
    return;
  }

  const existing = await prisma.registrationCounter.findUnique({
    where: { prefix: REGISTRATION_NUMBER_PREFIX }
  });

  await prisma.registrationCounter.upsert({
    where: { prefix: REGISTRATION_NUMBER_PREFIX },
    update: { current: { set: Math.max(existing?.current ?? 0, highest) } },
    create: { prefix: REGISTRATION_NUMBER_PREFIX, current: highest }
  });
}

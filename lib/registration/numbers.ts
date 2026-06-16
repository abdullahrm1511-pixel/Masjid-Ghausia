import { prisma } from "@/lib/prisma";
import { formatRegistrationNumber, REGISTRATION_NUMBER_PREFIX, registrationSequence } from "@/lib/constants";

export async function generateRegistrationNumber() {
  const counter = await prisma.registrationCounter.upsert({
    where: { prefix: REGISTRATION_NUMBER_PREFIX },
    update: { current: { increment: 1 } },
    create: { prefix: REGISTRATION_NUMBER_PREFIX, current: 1 }
  });

  return formatRegistrationNumber(counter.current);
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

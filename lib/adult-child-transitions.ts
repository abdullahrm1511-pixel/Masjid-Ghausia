import type { FamilyMemberStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function eighteenthBirthday(dateOfBirth: Date) {
  return new Date(Date.UTC(dateOfBirth.getUTCFullYear() + 18, dateOfBirth.getUTCMonth(), dateOfBirth.getUTCDate()));
}

function namePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .split(" ")[0] ?? "";
}

function sameDate(left: Date, right: Date) {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

async function findStandaloneDonorForAdultChild(child: { id: string; donorProfileId: string; firstName: string; lastName: string; dateOfBirth: Date }) {
  const candidates = await prisma.donorProfile.findMany({
    where: {
      id: { not: child.donorProfileId },
      registrationNumber: { not: null },
      lastName: { equals: child.lastName, mode: "insensitive" },
      dateOfBirth: child.dateOfBirth
    },
    select: { id: true, registrationNumber: true, firstName: true, lastName: true, dateOfBirth: true }
  });
  const matching = candidates.filter((donor) => sameDate(donor.dateOfBirth, child.dateOfBirth) && namePart(donor.firstName) === namePart(child.firstName));
  return matching.length === 1 ? matching[0] : null;
}

async function resolveAdultChildAsRegistered(child: { id: string; donorProfileId: string; firstName: string; lastName: string; dateOfBirth: Date; status: string }, donorId: string, registrationNumber: string | null) {
  const turned18At = eighteenthBirthday(child.dateOfBirth);
  const note = `Automatisch opgelost: zelfstandig lid gevonden op voornaam, achternaam en geboortedatum${registrationNumber ? ` (${registrationNumber})` : ""}.`;

  await prisma.$transaction([
    prisma.familyMember.update({
      where: { id: child.id },
      data: {
        status: "REGISTERED_SEPARATELY",
        isActive: false
      }
    }),
    prisma.adultChildTransition.upsert({
      where: { familyMemberId: child.id },
      update: {
        previousDonorProfileId: child.donorProfileId,
        newDonorProfileId: donorId,
        turned18At,
        status: "REGISTERED",
        resolvedAt: new Date(),
        notes: note
      },
      create: {
        familyMemberId: child.id,
        previousDonorProfileId: child.donorProfileId,
        newDonorProfileId: donorId,
        turned18At,
        status: "REGISTERED",
        resolvedAt: new Date(),
        notes: note
      }
    }),
    prisma.familyMemberStatusHistory.create({
      data: {
        familyMemberId: child.id,
        donorProfileId: child.donorProfileId,
        fromStatus: child.status as FamilyMemberStatus,
        toStatus: "REGISTERED_SEPARATELY",
        internalNote: note,
        donorMessage: "Deze persoon staat nu als zelfstandig lid geregistreerd."
      }
    })
  ]);
}

export async function syncAdultChildTransitions(today = new Date()) {
  const openTransitions = await prisma.adultChildTransition.findMany({
    where: { status: { in: ["NEEDS_REGISTRATION", "INVITED"] } },
    include: { familyMember: true }
  });

  let resolved = 0;
  for (const transition of openTransitions) {
    const standaloneDonor = await findStandaloneDonorForAdultChild(transition.familyMember);
    if (!standaloneDonor) continue;
    await resolveAdultChildAsRegistered(transition.familyMember, standaloneDonor.id, standaloneDonor.registrationNumber);
    resolved += 1;
  }

  const children = await prisma.familyMember.findMany({
    where: {
      type: "CHILD",
      isActive: true,
      status: { in: ["UNDER_18", "ACTIVE_DEPENDENT"] },
      dateOfBirth: { lte: new Date(Date.UTC(today.getFullYear() - 18, today.getMonth(), today.getDate())) }
    },
    select: {
      id: true,
      donorProfileId: true,
      dateOfBirth: true,
      status: true,
      firstName: true,
      lastName: true
    }
  });

  let created = 0;
  for (const child of children) {
    const turned18At = eighteenthBirthday(child.dateOfBirth);
    const standaloneDonor = await findStandaloneDonorForAdultChild(child);
    if (standaloneDonor) {
      await resolveAdultChildAsRegistered(child, standaloneDonor.id, standaloneDonor.registrationNumber);
      resolved += 1;
      continue;
    }

    await prisma.$transaction([
      prisma.familyMember.update({
        where: { id: child.id },
        data: {
          status: "ADULT_NEEDS_REGISTRATION",
          isActive: false
        }
      }),
      prisma.adultChildTransition.upsert({
        where: { familyMemberId: child.id },
        update: {
          previousDonorProfileId: child.donorProfileId,
          turned18At,
          status: "NEEDS_REGISTRATION"
        },
        create: {
          familyMemberId: child.id,
          previousDonorProfileId: child.donorProfileId,
          turned18At,
          status: "NEEDS_REGISTRATION",
          notes: "Automatisch aangemaakt omdat dit kind 18 jaar is geworden en zichzelf moet inschrijven."
        }
      })
    ]);
    created += 1;
  }

  return created + resolved;
}

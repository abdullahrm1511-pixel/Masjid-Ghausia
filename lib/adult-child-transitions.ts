import { prisma } from "@/lib/prisma";

function eighteenthBirthday(dateOfBirth: Date) {
  return new Date(Date.UTC(dateOfBirth.getUTCFullYear() + 18, dateOfBirth.getUTCMonth(), dateOfBirth.getUTCDate()));
}

export async function syncAdultChildTransitions(today = new Date()) {
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

  for (const child of children) {
    const turned18At = eighteenthBirthday(child.dateOfBirth);
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
  }

  return children.length;
}

import { prisma } from "@/lib/prisma";

type DonorForMembership = {
  id: string;
  registrationNumber: string | null;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
  activeSince?: Date | null;
  approvedAt?: Date | null;
};

function membershipClient() {
  return (prisma as unknown as { membership?: unknown }).membership ? (prisma as any) : null;
}

export async function ensurePrimaryMembership(donor: DonorForMembership) {
  if (!donor.registrationNumber) return null;
  const db = membershipClient();
  if (!db) return null;

  const membershipId = `m_${donor.id}`;
  const now = new Date();
  const createdAt = donor.createdAt ?? now;
  const updatedAt = donor.updatedAt ?? now;

  const membership = await db.membership.upsert({
    where: { registrationNumber: donor.registrationNumber },
    update: {
      status: donor.status,
      primaryDonorProfileId: donor.id,
      annualPayerDonorProfileId: donor.id
    },
    create: {
      id: membershipId,
      registrationNumber: donor.registrationNumber,
      status: donor.status,
      primaryDonorProfileId: donor.id,
      annualPayerDonorProfileId: donor.id,
      createdAt,
      updatedAt
    }
  });

  await db.donorProfile.update({
    where: { id: donor.id },
    data: { currentMembershipId: membership.id }
  });

  await db.membershipMember.upsert({
    where: {
      membershipId_donorProfileId: {
        membershipId: membership.id,
        donorProfileId: donor.id
      }
    },
    update: {
      role: "PRIMARY",
      displayNumber: donor.registrationNumber,
      isPrimaryPayer: true,
      isActive: true
    },
    create: {
      id: `mm_dp_${donor.id}`,
      membershipId: membership.id,
      donorProfileId: donor.id,
      role: "PRIMARY",
      displayNumber: donor.registrationNumber,
      isPrimaryPayer: true,
      isActive: true,
      activeFrom: donor.activeSince ?? donor.approvedAt ?? createdAt
    }
  });

  return membership as { id: string; registrationNumber: string };
}

export async function findPrimaryDonorByMembershipNumber(registrationNumber: string) {
  const db = membershipClient();
  if (!db || !registrationNumber) return null;

  const membership = await db.membership.findUnique({
    where: { registrationNumber },
    include: { primaryDonorProfile: true }
  });

  return membership?.primaryDonorProfile ?? null;
}

export async function membershipIdForRegistrationNumber(registrationNumber?: string | null) {
  const db = membershipClient();
  if (!db || !registrationNumber) return null;

  const membership = await db.membership.findUnique({
    where: { registrationNumber },
    select: { id: true }
  });

  return membership?.id ?? null;
}

export function normalizeManualRegistrationNumber(value: string) {
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, "");
  if (!cleaned) return "";

  const prefixedMatch = cleaned.match(/^11\D*(\d{1,8})$/);
  if (prefixedMatch) return `11-${prefixedMatch[1]}`;

  const digitsOnlyMatch = cleaned.match(/^(\d{1,8})$/);
  if (digitsOnlyMatch) return `11-${digitsOnlyMatch[1]}`;

  return cleaned;
}

export function registrationNumberCandidates(value: string) {
  const normalized = normalizeManualRegistrationNumber(value);
  if (!normalized) return [];

  const candidates = new Set<string>([normalized]);
  const match = normalized.match(/^11-(\d{1,8})$/);
  if (match) {
    const number = Number(match[1]);
    if (Number.isFinite(number)) {
      for (const width of [3, 4, 5, 6]) {
        candidates.add(`11-${String(number).padStart(width, "0")}`);
      }
    }
  }
  return [...candidates];
}

export async function findDonorByRegistrationNumber(registrationNumber: string) {
  const candidates = registrationNumberCandidates(registrationNumber);
  if (!candidates.length) return null;

  const membershipDonor = await findPrimaryDonorByMembershipNumber(registrationNumber);
  if (membershipDonor) return membershipDonor;

  const possibleDonors = await prisma.donorProfile.findMany({
    where: { registrationNumber: { in: candidates } },
    select: { id: true, registrationNumber: true }
  });
  const normalized = normalizeManualRegistrationNumber(registrationNumber);
  const exactDonor = possibleDonors.find((donor) => donor.registrationNumber === normalized);
  const selectedDonor = exactDonor ?? (possibleDonors.length === 1 ? possibleDonors[0] : null);
  return selectedDonor ? prisma.donorProfile.findUnique({ where: { id: selectedDonor.id } }) : null;
}

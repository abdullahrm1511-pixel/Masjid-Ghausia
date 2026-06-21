import type { DonorProfile, FamilyMember } from "@prisma/client";
import type { PersonCharge } from "@/types/domain";
import { DEFAULT_PRICING_CONFIG, type PricingConfig } from "@/lib/pricing-config";
import { prisma } from "@/lib/prisma";
import { PRICING_CONFIG_KEY } from "@/lib/pricing-config";
import { contributesToHousehold } from "@/lib/family-status";

function ageOn(dateOfBirth: Date, today = new Date()) {
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

export function fullMonthsOld(dateOfBirth: Date, today = new Date()) {
  let months = (today.getFullYear() - dateOfBirth.getFullYear()) * 12 + today.getMonth() - dateOfBirth.getMonth();
  if (today.getDate() < dateOfBirth.getDate()) months -= 1;
  return months;
}

export function isNearlyEighteen(dateOfBirth: Date, today = new Date()) {
  const months = fullMonthsOld(dateOfBirth, today);
  return months >= 17 * 12 + 6 && months < 18 * 12;
}

export function calculateMonthlyPenalty(today = new Date(), config: PricingConfig = DEFAULT_PRICING_CONFIG) {
  const windowEnd = new Date(today.getFullYear(), config.paymentWindowEndMonth - 1, config.paymentWindowEndDay, 23, 59, 59, 999);
  if (today <= windowEnd) return 0;

  const firstPenaltyMonth = config.paymentWindowEndMonth + 1;
  const currentMonth = today.getMonth() + 1;
  if (currentMonth < firstPenaltyMonth || currentMonth > 12) return 0;

  return (currentMonth - firstPenaltyMonth + 1) * config.monthlyPenaltyAfterWindow;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function oneTimePaymentDeadline(approvedAt?: Date | null) {
  if (!approvedAt) return null;
  const deadline = startOfDay(approvedAt);
  deadline.setDate(deadline.getDate() + 365);
  return deadline;
}

export function oneTimePaymentDaysRemaining(approvedAt?: Date | null, today = new Date()) {
  const deadline = oneTimePaymentDeadline(approvedAt);
  if (!deadline) return null;

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((deadline.getTime() - startOfDay(today).getTime()) / millisecondsPerDay);
}

export function calculateAnnualContributionForApproval(
  annualAmount: number,
  approvedAt?: Date | null,
  hasAnnualPayment = false,
  today = new Date(),
  config: PricingConfig = DEFAULT_PRICING_CONFIG
) {
  if (annualAmount <= 0) {
    return {
      annualContribution: 0,
      penaltyContribution: 0,
      annualYearsDue: 0,
      annualPaymentWindowLabel: ""
    };
  }

  if (hasAnnualPayment) {
    return {
      annualContribution: annualAmount,
      penaltyContribution: calculateMonthlyPenalty(today, config),
      annualYearsDue: 1,
      annualPaymentWindowLabel: `1 januari t/m ${config.paymentWindowEndDay}-${config.paymentWindowEndMonth}`
    };
  }

  const approvedYear = approvedAt?.getFullYear() ?? today.getFullYear();
  const currentYear = today.getFullYear();
  const annualYearsDue = Math.max(currentYear - approvedYear + 1, 1);
  const annualContribution = annualAmount * annualYearsDue;

  if (currentYear <= approvedYear) {
    return {
      annualContribution,
      penaltyContribution: 0,
      annualYearsDue,
      annualPaymentWindowLabel: "Geen boete in het inschrijfjaar"
    };
  }

  const currentMonth = today.getMonth() + 1;
  const penaltyMonths = Math.max(currentMonth - 1, 0);

  return {
    annualContribution,
    penaltyContribution: penaltyMonths * config.monthlyPenaltyAfterWindow,
    annualYearsDue,
    annualPaymentWindowLabel: "Eerste boete vanaf februari na de jaarwisseling"
  };
}

function oneTimeAmount(age: number, config: PricingConfig) {
  return (
    config.oneTimeBrackets.find((bracket) => {
      const underMax = bracket.maxAge === null || age <= bracket.maxAge;
      return age >= bracket.minAge && underMax;
    })?.amount ?? 0
  );
}

export function calculateCurrentAnnualAmount(
  donorProfile: Pick<DonorProfile, "dateOfBirth" | "maritalStatus">,
  familyMembers: Array<Pick<FamilyMember, "dateOfBirth" | "type" | "isActive"> & { status?: string | null }>,
  config: PricingConfig = DEFAULT_PRICING_CONFIG,
  today = new Date()
) {
  if (ageOn(donorProfile.dateOfBirth, today) < 18) return 0;

  const activeFamily = familyMembers.filter((member) => member.isActive && contributesToHousehold(member.status));
  const partner = activeFamily.find((member) => member.type === "PARTNER");
  const children = activeFamily.filter((member) => member.type === "CHILD");
  const under18Children = children.filter((child) => ageOn(child.dateOfBirth, today) < 18);

  if (partner && under18Children.length > 0) return config.annualFamily;
  if (!partner && under18Children.length > 0) return config.annualSingleParent;
  return config.annualIndividual18Plus;
}

export function calculateDonorCharges(
  donorProfile: Pick<DonorProfile, "firstName" | "lastName" | "dateOfBirth" | "maritalStatus" | "approvedAt">,
  familyMembers: Array<Pick<FamilyMember, "firstName" | "lastName" | "dateOfBirth" | "type" | "isActive"> & { status?: string | null }>,
  config: PricingConfig = DEFAULT_PRICING_CONFIG,
  options: { hasAnnualPayment?: boolean; today?: Date } = {}
): PersonCharge[] {
  const today = options.today ?? new Date();
  const activeFamily = familyMembers.filter((member) => member.isActive && contributesToHousehold(member.status));
  const partner = activeFamily.find((member) => member.type === "PARTNER");
  const children = activeFamily.filter((member) => member.type === "CHILD");
  const annualForMain = calculateCurrentAnnualAmount(donorProfile, familyMembers, config, today);

  const people = [
    {
      name: `${donorProfile.firstName} ${donorProfile.lastName}`.trim(),
      role: "hoofddonateur" as const,
      dateOfBirth: donorProfile.dateOfBirth,
      annualContribution: ageOn(donorProfile.dateOfBirth, today) >= 18 ? annualForMain : 0
    },
    ...(partner
      ? [
          {
            name: `${partner.firstName} ${partner.lastName}`.trim(),
            role: "partner" as const,
            dateOfBirth: partner.dateOfBirth,
            annualContribution: 0
          }
        ]
      : []),
    ...children.map((child) => ({
      name: `${child.firstName} ${child.lastName}`.trim(),
      role: "kind" as const,
      dateOfBirth: child.dateOfBirth,
      annualContribution: 0
    }))
  ];

  return people.map((person) => {
    const age = ageOn(person.dateOfBirth, today);
    const oneTimeContribution = oneTimeAmount(age, config);
    const annualDetails = calculateAnnualContributionForApproval(
      person.annualContribution,
      donorProfile.approvedAt,
      options.hasAnnualPayment,
      today,
      config
    );
    const oneTimeDaysRemaining = oneTimePaymentDaysRemaining(donorProfile.approvedAt, today);
    return {
      name: person.name,
      role: person.role,
      age,
      oneTimeContribution,
      annualContribution: annualDetails.annualContribution,
      penaltyContribution: annualDetails.penaltyContribution,
      annualYearsDue: annualDetails.annualYearsDue,
      annualPaymentWindowLabel: annualDetails.annualPaymentWindowLabel,
      oneTimeDeadline: oneTimePaymentDeadline(donorProfile.approvedAt),
      oneTimeDaysRemaining,
      total: oneTimeContribution + annualDetails.annualContribution + annualDetails.penaltyContribution,
      paymentStatus: "Niet betaald"
    };
  });
}

export async function getPricingConfig(): Promise<PricingConfig> {
  const config = await prisma.appConfig.findUnique({
    where: { key: PRICING_CONFIG_KEY }
  });

  if (!config?.value || typeof config.value !== "object") {
    return DEFAULT_PRICING_CONFIG;
  }

  return {
    ...DEFAULT_PRICING_CONFIG,
    ...(config.value as Partial<PricingConfig>)
  };
}

export async function savePricingConfig(value: PricingConfig) {
  return prisma.appConfig.upsert({
    where: { key: PRICING_CONFIG_KEY },
    update: {
      value: value as unknown as object,
      description: "Configureerbare St. GBC prijsregels"
    },
    create: {
      key: PRICING_CONFIG_KEY,
      value: value as unknown as object,
      description: "Configureerbare St. GBC prijsregels"
    }
  });
}

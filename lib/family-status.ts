import type { FamilyMemberStatus } from "@prisma/client";

export function familyMemberStatusLabel(status?: FamilyMemberStatus | string | null) {
  if (status === "ACTIVE_DEPENDENT") return "Gezinslid";
  if (status === "UNDER_18") return "Onder 18";
  if (status === "ADULT_NEEDS_REGISTRATION") return "18+ / geen lid";
  if (status === "REGISTERED_SEPARATELY") return "Zelfstandig lid";
  if (status === "NOT_A_MEMBER") return "Geen lid";
  if (status === "DECEASED") return "Overleden";
  return status ?? "-";
}

export function familyMemberStatusBadgeClass(status?: FamilyMemberStatus | string | null) {
  if (status === "UNDER_18" || status === "ACTIVE_DEPENDENT") return "bg-emerald-50 text-emerald-800";
  if (status === "ADULT_NEEDS_REGISTRATION") return "bg-amber-50 text-amber-900";
  if (status === "REGISTERED_SEPARATELY") return "bg-sky-50 text-sky-800";
  if (status === "NOT_A_MEMBER" || status === "DECEASED") return "bg-red-50 text-red-800";
  return "bg-slate-100 text-slate-700";
}

export function contributesToHousehold(status?: FamilyMemberStatus | string | null) {
  return status === "UNDER_18" || status === "ACTIVE_DEPENDENT" || !status;
}

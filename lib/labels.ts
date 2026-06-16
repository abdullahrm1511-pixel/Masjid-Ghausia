import type { DonorStatus, PaymentObligationStatus } from "@prisma/client";

export function donorStatusLabel(status?: DonorStatus | string | null) {
  if (status === "PENDING") return "In afwachting";
  if (status === "ACTIVE") return "Actief";
  if (status === "ACTION_REQUIRED") return "Correctie nodig";
  if (status === "INACTIVE") return "Inactief";
  if (status === "REJECTED") return "Afgewezen";
  if (status === "DECEASED") return "Overleden";
  if (status === "PAYMENT_REQUIRED") return "Betaling afwachtend";
  return status ?? "-";
}

export function donorStatusBadgeClass(status?: DonorStatus | string | null) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-800";
  if (status === "PAYMENT_REQUIRED" || status === "ACTION_REQUIRED" || status === "PENDING") return "bg-amber-50 text-amber-800";
  if (status === "INACTIVE" || status === "REJECTED" || status === "DECEASED") return "bg-red-50 text-red-800";
  return "bg-stone-100 text-slate-700";
}

export function paymentStatusLabel(status?: PaymentObligationStatus | string | null) {
  if (status === "DUE") return "Openstaand";
  if (status === "PAID") return "Betaald";
  if (status === "WAIVED") return "Kwijtgescholden";
  if (status === "MANUAL_CORRECTION") return "Correctie";
  return status ?? "-";
}

export function paymentStatusBadgeClass(status?: PaymentObligationStatus | string | null) {
  if (status === "PAID") return "bg-emerald-50 text-emerald-800";
  if (status === "DUE") return "bg-red-50 text-red-800";
  if (status === "WAIVED") return "bg-stone-100 text-slate-700";
  return "bg-amber-50 text-amber-800";
}

export function obligationTypeLabel(type?: string | null) {
  if (type === "ONE_TIME") return "Eenmalig";
  if (type === "ANNUAL") return "Jaarlijks";
  if (type === "MANUAL") return "Extra betaling";
  return type ?? "-";
}

export function paymentMethodLabel(method?: string | null) {
  if (method === "BANK_TRANSFER") return "Bankoverschrijving";
  if (method === "EXTERNAL_IDEAL") return "iDEAL";
  if (method === "EXTERNAL_SEPA") return "SEPA";
  if (method === "OTHER") return "Overig";
  return method ?? "-";
}

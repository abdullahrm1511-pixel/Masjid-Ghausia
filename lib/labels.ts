import type { DonorStatus, PaymentObligationStatus } from "@prisma/client";

export function donorStatusLabel(status?: DonorStatus | string | null) {
  if (status === "PENDING") return "In afwachting";
  if (status === "ACTIVE") return "Actief";
  if (status === "ACTION_REQUIRED") return "Correctie nodig";
  if (status === "INACTIVE") return "Inactief";
  if (status === "REJECTED") return "Afgewezen";
  if (status === "DECEASED") return "Overleden";
  if (status === "PAYMENT_REQUIRED") return "Inactief";
  return status ?? "-";
}

export function donorStatusBadgeClass(status?: DonorStatus | string | null) {
  if (status === "ACTIVE") return "border border-teal-200 bg-teal-50 text-teal-800";
  if (status === "PENDING") return "border border-sky-200 bg-sky-50 text-sky-800";
  if (status === "ACTION_REQUIRED") return "border border-amber-200 bg-amber-50 text-amber-800";
  if (status === "INACTIVE" || status === "PAYMENT_REQUIRED" || status === "REJECTED" || status === "DECEASED") return "border border-red-200 bg-red-50 text-red-800";
  return "border border-slate-200 bg-slate-100 text-slate-700";
}

export function paymentStatusLabel(status?: PaymentObligationStatus | string | null) {
  if (status === "DUE") return "Openstaand";
  if (status === "PAID") return "Betaald";
  if (status === "WAIVED") return "Kwijtgescholden";
  if (status === "MANUAL_CORRECTION") return "Correctie";
  return status ?? "-";
}

export function paymentStatusBadgeClass(status?: PaymentObligationStatus | string | null) {
  if (status === "PAID") return "border border-teal-200 bg-teal-50 text-teal-800";
  if (status === "DUE") return "border border-red-200 bg-red-50 text-red-800";
  if (status === "WAIVED") return "border border-slate-200 bg-slate-100 text-slate-700";
  return "border border-amber-200 bg-amber-50 text-amber-800";
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

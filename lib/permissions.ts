import type { UserRole } from "@prisma/client";

export function isAdminRole(role?: UserRole | null) {
  return role === "REGISTRATION_ADMIN" || role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canReviewRegistrations(role?: UserRole | null) {
  return role === "REGISTRATION_ADMIN" || role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canManageSettings(role?: UserRole | null) {
  return role === "SUPER_ADMIN";
}

export function canManageDonors(role?: UserRole | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

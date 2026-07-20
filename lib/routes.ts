import type { UserRole } from "@prisma/client";
import { isAdminRole } from "@/lib/permissions";

export function roleHomePath(role?: UserRole | null) {
  if (isAdminRole(role)) return "/admin";
  if (role === "DONOR") return "/dashboard";
  return "/";
}

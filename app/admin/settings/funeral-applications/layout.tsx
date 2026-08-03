import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageDonors } from "@/lib/permissions";

export default async function FuneralApplicationsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!canManageDonors(session?.user.role)) redirect("/admin/settings");
  return children;
}

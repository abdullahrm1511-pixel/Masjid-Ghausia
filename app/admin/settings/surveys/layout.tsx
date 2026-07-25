import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";

export default async function SurveySettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!canManageSettings(session?.user.role)) redirect("/admin/settings");
  return children;
}

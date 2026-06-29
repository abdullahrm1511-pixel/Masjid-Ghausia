import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!isAdminRole(session?.user.role)) {
    redirect("/login");
  }

  return children;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { roleHomePath } from "@/lib/routes";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata;

export default async function DonorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user.id) {
    redirect("/login");
  }

  if (session.user.role !== "DONOR") {
    redirect(roleHomePath(session.user.role));
  }

  return children;
}

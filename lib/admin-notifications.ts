import { prisma } from "@/lib/prisma";
import { prepareEmailLog } from "@/lib/email/templates";

type AdminNotificationInput = {
  status: string;
  entityType: string;
  entityId: string;
  loginPath: string;
};

export async function notifyAdmins(input: AdminNotificationInput) {
  const admins = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
      email: { not: { startsWith: "legacy+" } }
    },
    select: { email: true, name: true }
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  const loginlink = `${baseUrl}${input.loginPath}`;

  await Promise.all(
    admins.map((admin) =>
      prepareEmailLog({
        templateKey: "ADMIN_NOTIFICATION",
        recipient: admin.email,
        entityType: input.entityType,
        entityId: input.entityId,
        data: {
          naam: admin.name ?? "admin",
          status: input.status,
          loginlink,
          organisatie: "St. GBC Masjid Ghausia"
        }
      })
    )
  );
}

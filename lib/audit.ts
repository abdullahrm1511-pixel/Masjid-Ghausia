import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  actorId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export async function writeAuditLog(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      message: input.message,
      metadata: input.metadata
    }
  });
}

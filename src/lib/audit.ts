import { prisma } from "./prisma";
import type { SafeEmployee } from "./auth";

export async function logAudit(
  actor: SafeEmployee | null,
  action: string,
  resource: string,
  severity: "info" | "warning" | "danger" = "info",
  ip = ""
) {
  await prisma.auditLogEntry.create({
    data: {
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? "Unknown",
      action,
      resource,
      ip,
      severity,
    },
  });
}

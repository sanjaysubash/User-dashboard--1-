import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const logs = await prisma.auditLogEntry.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return NextResponse.json({
    logs: logs.map((l) => ({
      user: l.actorName,
      action: l.action,
      resource: l.resource,
      ip: l.ip || "—",
      severity: l.severity,
      time: l.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    })),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const EDITABLE_FIELDS = [
  "companyName", "domain", "industry", "companySize", "headquarters",
  "fiscalYearStart", "currency", "timezone", "dateFormat",
  "twoFactorEnabled", "ssoEnabled", "passwordPolicy", "sessionTimeoutHours",
  "notifyTaskAssignments", "notifyProjectUpdates", "notifyLeaveApprovals", "notifyPayrollProcessed",
] as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.orgSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  const settings = await prisma.orgSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });

  await logAudit(user, "Updated organization settings", "Settings");

  return NextResponse.json({ settings });
}

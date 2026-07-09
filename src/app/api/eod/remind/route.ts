import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { notify } from "@/lib/notify";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

async function authorize(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("authorization");
    if (header === `Bearer ${secret}`) return true;
  }
  const user = await getCurrentUser();
  return !!user && isHrAdmin(user);
}

async function sendReminders(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = startOfDay(new Date());
  const [employees, reports] = await Promise.all([
    prisma.employee.findMany({ where: { status: { not: "inactive" } }, select: { id: true } }),
    prisma.eODReport.findMany({ where: { date: today }, select: { employeeId: true } }),
  ]);
  const submitted = new Set(reports.map((r) => r.employeeId));
  const missing = employees.filter((e) => !submitted.has(e.id));

  const existingReminders = await prisma.notification.findMany({
    where: { type: "eod-reminder", createdAt: { gte: today }, employeeId: { in: missing.map((e) => e.id) } },
    select: { employeeId: true },
  });
  const alreadyReminded = new Set(existingReminders.map((n) => n.employeeId));
  const toRemind = missing.filter((e) => !alreadyReminded.has(e.id));

  for (const e of toRemind) {
    await notify(e.id, "eod-reminder", "Submit your EOD report", "You haven't submitted today's end-of-day report yet.", "eod");
  }

  return NextResponse.json({ ok: true, reminded: toRemind.length, alreadySubmitted: submitted.size });
}

// Triggered manually by an HR admin clicking "Send Reminders Now" in the UI.
export async function POST(req: NextRequest) {
  return sendReminders(req);
}

// Triggered automatically once a day by Vercel Cron (see vercel.json), which
// only ever issues GET requests and authenticates via the CRON_SECRET bearer
// token set in the project's environment variables.
export async function GET(req: NextRequest) {
  return sendReminders(req);
}

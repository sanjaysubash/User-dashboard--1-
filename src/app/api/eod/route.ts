import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = startOfDay(new Date());
  const [todayReport, history] = await Promise.all([
    prisma.eODReport.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } }),
    prisma.eODReport.findMany({ where: { employeeId: user.id }, orderBy: { date: "desc" }, take: 10 }),
  ]);

  return NextResponse.json({
    submittedToday: !!todayReport,
    today: todayReport ? { summary: todayReport.summary, blockers: todayReport.blockers, tomorrowPlan: todayReport.tomorrowPlan } : null,
    history: history.map((r) => ({
      id: r.id,
      date: r.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      summary: r.summary,
      blockers: r.blockers,
      tomorrowPlan: r.tomorrowPlan,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const summary = body?.summary?.trim();
  if (!summary) return NextResponse.json({ error: "A summary of today's work is required." }, { status: 400 });

  const today = startOfDay(new Date());
  const report = await prisma.eODReport.upsert({
    where: { employeeId_date: { employeeId: user.id, date: today } },
    create: { employeeId: user.id, date: today, summary, blockers: body?.blockers || null, tomorrowPlan: body?.tomorrowPlan || null },
    update: { summary, blockers: body?.blockers || null, tomorrowPlan: body?.tomorrowPlan || null },
  });

  return NextResponse.json({ ok: true, id: report.id });
}

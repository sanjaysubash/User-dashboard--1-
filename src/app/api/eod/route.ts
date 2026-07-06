import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function countWeekdays(start: Date, end: Date) {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function parseTaskIds(json: string): number[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = startOfDay(new Date());
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [todayReport, history, monthReports] = await Promise.all([
    prisma.eODReport.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } }),
    prisma.eODReport.findMany({ where: { employeeId: user.id }, orderBy: { date: "desc" }, take: 10 }),
    prisma.eODReport.findMany({ where: { employeeId: user.id, date: { gte: monthStart, lte: today } }, select: { date: true } }),
  ]);

  const allTaskIds = Array.from(new Set([...(todayReport ? parseTaskIds(todayReport.taskIds) : []), ...history.flatMap((r) => parseTaskIds(r.taskIds))]));
  const tasks = allTaskIds.length ? await prisma.task.findMany({ where: { id: { in: allTaskIds } }, select: { id: true, title: true } }) : [];
  const taskTitle = new Map(tasks.map((t) => [t.id, t.title]));
  const resolve = (ids: number[]) => ids.map((id) => taskTitle.get(id)).filter((t): t is string => !!t);

  return NextResponse.json({
    submittedToday: !!todayReport,
    today: todayReport
      ? { summary: todayReport.summary, blockers: todayReport.blockers, tomorrowPlan: todayReport.tomorrowPlan, taskIds: parseTaskIds(todayReport.taskIds) }
      : null,
    history: history.map((r) => ({
      id: r.id,
      date: r.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      summary: r.summary,
      blockers: r.blockers,
      tomorrowPlan: r.tomorrowPlan,
      tasks: resolve(parseTaskIds(r.taskIds)),
    })),
    compliance: {
      submitted: monthReports.length,
      workingDays: countWeekdays(monthStart, today),
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const summary = body?.summary?.trim();
  if (!summary) return NextResponse.json({ error: "A summary of today's work is required." }, { status: 400 });

  const requestedTaskIds: number[] = Array.isArray(body?.taskIds) ? body.taskIds.map(Number).filter(Number.isFinite) : [];
  const ownedTasks = requestedTaskIds.length
    ? await prisma.task.findMany({ where: { id: { in: requestedTaskIds }, assigneeId: user.id }, select: { id: true } })
    : [];
  const taskIds = JSON.stringify(ownedTasks.map((t) => t.id));

  const today = startOfDay(new Date());
  const report = await prisma.eODReport.upsert({
    where: { employeeId_date: { employeeId: user.id, date: today } },
    create: { employeeId: user.id, date: today, summary, blockers: body?.blockers || null, tomorrowPlan: body?.tomorrowPlan || null, taskIds },
    update: { summary, blockers: body?.blockers || null, tomorrowPlan: body?.tomorrowPlan || null, taskIds },
  });

  return NextResponse.json({ ok: true, id: report.id });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = startOfDay(new Date());

  const [totalEmployees, presentToday, activeProjects, overdueTasks, totalTasks, doneTasks, tasksWithDept, recentActivity] = await Promise.all([
    prisma.employee.count({ where: { status: { not: "inactive" } } }),
    prisma.attendance.count({ where: { date: today, status: { not: "absent" } } }),
    prisma.project.count({ where: { status: { in: ["planning", "in-progress", "review"] } } }),
    prisma.task.count({ where: { status: { not: "done" }, dueDate: { lt: today } } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "done" } }),
    prisma.task.findMany({ select: { status: true, assignee: { select: { department: { select: { name: true } } } } } }),
    prisma.auditLogEntry.findMany({ where: { resource: { not: "Payroll" } }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const STATUS_KEYS = ["todo", "in-progress", "review", "done"] as const;
  const byDept: Record<string, Record<string, number>> = {};
  for (const t of tasksWithDept) {
    const dept = t.assignee?.department?.name ?? "Unassigned";
    byDept[dept] ??= { todo: 0, "in-progress": 0, review: 0, done: 0 };
    byDept[dept][t.status] = (byDept[dept][t.status] ?? 0) + 1;
  }
  const taskStatusByDept = Object.entries(byDept).map(([dept, counts]) => ({ dept, ...counts }));

  const statusCounts: Record<string, number> = { todo: 0, "in-progress": 0, review: 0, done: 0 };
  for (const t of tasksWithDept) statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;
  const STATUS_LABELS: Record<string, string> = { todo: "To Do", "in-progress": "In Progress", review: "In Review", done: "Done" };
  const STATUS_COLORS: Record<string, string> = { todo: "#64748B", "in-progress": "#4F46E5", review: "#F59E0B", done: "#22C55E" };
  const taskStatusBreakdown = STATUS_KEYS.map((k) => ({ name: STATUS_LABELS[k], value: statusCounts[k] ?? 0, color: STATUS_COLORS[k] }));

  return NextResponse.json({
    totalEmployees,
    presentToday,
    presentPct: totalEmployees ? Math.round((presentToday / totalEmployees) * 1000) / 10 : 0,
    activeProjects,
    overdueTasks,
    taskCompletionPct: totalTasks ? Math.round((doneTasks / totalTasks) * 1000) / 10 : 0,
    taskStatusByDept,
    taskStatusBreakdown,
    totalTasks,
    recentActivity: recentActivity.map((l) => ({
      actor: l.actorName,
      action: l.action,
      resource: l.resource,
      time: l.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    })),
  });
}

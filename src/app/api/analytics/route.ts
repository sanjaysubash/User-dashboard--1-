import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [totalEmployees, activeEmployees, totalTasks, doneTasks, overdueTasks, departments, kpis] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: "active" } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "done" } }),
    prisma.task.count({ where: { status: { not: "done" }, dueDate: { lt: new Date() } } }),
    prisma.department.findMany({ include: { employees: true, projects: true } }),
    prisma.kPI.findMany(),
  ]);

  const avgKpiAchievement = kpis.length
    ? Math.round((kpis.reduce((a, k) => a + Math.min(1, k.current / (k.target || 1)), 0) / kpis.length) * 1000) / 10
    : 0;

  return NextResponse.json({
    totalEmployees,
    activeEmployees,
    taskCompletionPct: totalTasks ? Math.round((doneTasks / totalTasks) * 1000) / 10 : 0,
    overdueTasks,
    avgKpiAchievement,
    departmentWorkforce: departments.map((d) => ({
      name: d.name,
      employees: d.employees.length,
      projects: d.projects.filter((p) => p.status !== "completed").length,
    })),
  });
}

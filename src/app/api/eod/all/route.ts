import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";

function parseDateParam(s: string | null): Date {
  if (s) {
    const [y, m, d] = s.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const date = parseDateParam(new URL(req.url).searchParams.get("date"));

  const [employees, reports] = await Promise.all([
    prisma.employee.findMany({ where: { status: { not: "inactive" } }, orderBy: { name: "asc" } }),
    prisma.eODReport.findMany({ where: { date } }),
  ]);
  const byEmployee = new Map(reports.map((r) => [r.employeeId, r]));

  return NextResponse.json({
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    employees: employees.map((e) => {
      const r = byEmployee.get(e.id);
      return {
        id: e.id,
        name: e.name,
        title: e.title,
        avatar: e.avatarInitials,
        avatarColor: e.avatarColor,
        submitted: !!r,
        summary: r?.summary ?? null,
        blockers: r?.blockers ?? null,
        tomorrowPlan: r?.tomorrowPlan ?? null,
      };
    }),
  });
}

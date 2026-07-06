import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { getAttendanceRates } from "@/lib/attendance";

const SENSITIVE_TYPES = ["payroll", "audit", "expenses"];

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = new URL(req.url).searchParams.get("type") ?? "";
  if (SENSITIVE_TYPES.includes(type) && !isHrAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let rows: Record<string, unknown>[] = [];

  if (type === "headcount") {
    const employees = await prisma.employee.findMany({ include: { department: true } });
    rows = employees.map((e) => ({ Name: e.name, Department: e.department?.name ?? "", Title: e.title, Status: e.status, Joined: e.joinedAt.toISOString().slice(0, 10) }));
  } else if (type === "payroll") {
    const records = await prisma.payrollRecord.findMany({ include: { employee: true }, orderBy: { month: "desc" } });
    rows = records.map((r) => ({ Employee: r.employee.name, Month: r.month, Amount: r.amount, Status: r.status }));
  } else if (type === "projects") {
    const projects = await prisma.project.findMany({ include: { manager: true, tasks: true } });
    rows = projects.map((p) => ({ Project: p.name, Status: p.status, Manager: p.manager?.name ?? "", Budget: p.budget ?? 0, Spent: p.spent, Tasks: p.tasks.length, Completed: p.tasks.filter((t) => t.status === "done").length }));
  } else if (type === "attendance") {
    const employees = await prisma.employee.findMany({ include: { department: true } });
    const rates = await getAttendanceRates(employees.map((e) => e.id));
    rows = employees.map((e) => ({ Name: e.name, Department: e.department?.name ?? "", AttendanceRate30d: rates[e.id] ?? 100 }));
  } else if (type === "performance") {
    const reviews = await prisma.performanceReview.findMany({ include: { employee: true, reviewer: true, cycle: true } });
    rows = reviews.map((r) => ({ Employee: r.employee.name, Reviewer: r.reviewer?.name ?? "", Cycle: r.cycle.name, Score: r.score ?? "", Status: r.status }));
  } else if (type === "kpi") {
    const kpis = await prisma.kPI.findMany({ include: { department: true } });
    rows = kpis.map((k) => ({ KPI: k.name, Department: k.department?.name ?? "", Current: k.current, Target: k.target, Unit: k.unit, Period: k.period }));
  } else if (type === "audit") {
    const logs = await prisma.auditLogEntry.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
    rows = logs.map((l) => ({ User: l.actorName, Action: l.action, Resource: l.resource, IP: l.ip, Severity: l.severity, Time: l.createdAt.toISOString() }));
  } else if (type === "expenses") {
    const expenses = await prisma.operatingExpense.findMany({ orderBy: { month: "desc" } });
    rows = expenses.map((e) => ({ Category: e.category, Month: e.month, Amount: e.amount, Budget: e.budgetAmount }));
  } else {
    return NextResponse.json({ error: "Unknown report type." }, { status: 400 });
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${type}-report.csv"`,
    },
  });
}

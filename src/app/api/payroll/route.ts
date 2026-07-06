import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin, canApprove } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function lastNMonths(n: number) {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employeeIdParam = new URL(req.url).searchParams.get("employeeId");
  if (employeeIdParam) {
    const targetId = Number(employeeIdParam);
    if (targetId !== user.id && !isHrAdmin(user) && !canApprove(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const records = await prisma.payrollRecord.findMany({ where: { employeeId: targetId }, orderBy: { month: "desc" }, take: 12 });
    return NextResponse.json({
      payslips: records.map((r) => ({
        id: r.id,
        month: monthLabel(r.month),
        basic: r.basic,
        allowances: r.allowances,
        deductions: r.deductions,
        netPay: r.netPay,
        status: r.status,
      })),
    });
  }

  const month = currentMonth();
  const months = lastNMonths(6);

  const [records, trendRecords, employees] = await Promise.all([
    prisma.payrollRecord.findMany({ where: { month }, include: { employee: true }, orderBy: { id: "asc" } }),
    prisma.payrollRecord.findMany({ where: { month: { in: months } } }),
    prisma.employee.findMany({ where: { status: { not: "inactive" } }, include: { department: true } }),
  ]);

  const trend = months.map((m) => {
    const rows = trendRecords.filter((r) => r.month === m);
    const gross = rows.reduce((a, r) => a + r.basic + r.allowances, 0);
    const net = rows.reduce((a, r) => a + r.netPay, 0);
    return { month: monthLabel(m), gross, net };
  });

  const deptTotals = new Map<string, { salary: number; count: number }>();
  for (const e of employees) {
    const name = e.department?.name ?? "Unassigned";
    const cur = deptTotals.get(name) ?? { salary: 0, count: 0 };
    cur.salary += (e.salary ?? 0) / 12;
    cur.count += 1;
    deptTotals.set(name, cur);
  }

  const totalGross = records.reduce((a, r) => a + r.basic + r.allowances, 0);
  const totalDeductions = records.reduce((a, r) => a + r.deductions, 0);
  const totalNet = records.reduce((a, r) => a + r.netPay, 0);

  return NextResponse.json({
    month: monthLabel(month),
    alreadyRun: records.length > 0,
    summary: { totalGross, totalNet, totalDeductions, employeesPaid: records.length },
    trend,
    salaryByDept: Array.from(deptTotals.entries()).map(([name, v]) => ({ name, monthly: Math.round(v.salary) })),
    payslips: records.map((r) => ({
      id: r.id,
      name: r.employee.name,
      avatar: r.employee.avatarInitials,
      avatarColor: r.employee.avatarColor,
      basic: r.basic,
      allowances: r.allowances,
      deductions: r.deductions,
      netPay: r.netPay,
      status: r.status,
    })),
  });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const month = currentMonth();
  const existing = await prisma.payrollRecord.count({ where: { month } });
  if (existing > 0) return NextResponse.json({ error: "Payroll has already been run for this month." }, { status: 409 });

  const employees = await prisma.employee.findMany({ where: { status: { not: "inactive" }, salary: { not: null } } });

  let created = 0;
  for (const e of employees) {
    const basic = Math.round((e.salary ?? 0) / 12);
    const allowances = Math.round(basic * 0.15);
    const deductions = Math.round(basic * 0.22);
    const netPay = basic + allowances - deductions;
    await prisma.payrollRecord.create({
      data: { employeeId: e.id, month, basic, allowances, deductions, netPay, status: "processed" },
    });
    await notify(e.id, "payroll", "Payroll processed", `Your ${monthLabel(month)} payslip is ready.`, "payroll");
    created++;
  }

  await logAudit(user, `Ran payroll for ${monthLabel(month)} (${created} employees)`, "Payroll");

  return NextResponse.json({ ok: true, created });
}

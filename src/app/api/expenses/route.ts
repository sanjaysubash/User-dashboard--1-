import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const CATEGORIES = ["Benefits", "Operations", "Marketing", "Infrastructure", "Travel", "Training"];

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

async function payrollTotalForMonth(month: string) {
  const rows = await prisma.payrollRecord.findMany({ where: { month, status: "paid" } });
  return rows.reduce((a, r) => a + r.amount, 0);
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const months = lastNMonths(6);
  const selected = new URL(req.url).searchParams.get("month") || months[months.length - 1];

  const rows = await prisma.operatingExpense.findMany({ where: { month: { in: months } } });
  const payrollByMonth: Record<string, number> = {};
  for (const m of months) payrollByMonth[m] = await payrollTotalForMonth(m);

  const trend = months.map((m) => {
    const forMonth = rows.filter((r) => r.month === m);
    const get = (cat: string) => forMonth.find((r) => r.category === cat)?.amount ?? 0;
    return {
      month: monthLabel(m),
      payroll: Math.round(payrollByMonth[m] / 1000),
      benefits: Math.round(get("Benefits") / 1000),
      ops: Math.round(get("Operations") / 1000),
      marketing: Math.round(get("Marketing") / 1000),
      infra: Math.round(get("Infrastructure") / 1000),
      travel: Math.round(get("Travel") / 1000),
    };
  });

  const selRows = rows.filter((r) => r.month === selected);
  const prevIdx = months.indexOf(selected) - 1;
  const prevMonth = prevIdx >= 0 ? months[prevIdx] : null;
  const prevRows = prevMonth ? rows.filter((r) => r.month === prevMonth) : [];
  const prevPayroll = prevMonth ? payrollByMonth[prevMonth] : 0;
  const payrollActual = payrollByMonth[selected] ?? 0;

  const categoryRow = (name: string, amount: number, prevAmount: number, budget?: number) => {
    const vsLast = prevAmount ? Math.round(((amount - prevAmount) / prevAmount) * 1000) / 10 : 0;
    return { name, amount, vsLast, trend: vsLast > 1 ? "up" : vsLast < -1 ? "down" : "flat", budget };
  };

  const allRows = [
    categoryRow("Payroll", payrollActual, prevPayroll, Math.round(payrollActual * 1.02)),
    ...CATEGORIES.map((cat) => {
      const row = selRows.find((r) => r.category === cat);
      const prevRow = prevRows.find((r) => r.category === cat);
      return categoryRow(cat, row?.amount ?? 0, prevRow?.amount ?? 0, row?.budgetAmount);
    }),
  ];
  const totalExpense = allRows.reduce((a, r) => a + r.amount, 0);

  const employees = await prisma.employee.findMany({ where: { status: { not: "inactive" } }, include: { department: true } });
  const deptTotals = new Map<string, { cost: number; color: string }>();
  const depts = await prisma.department.findMany();
  for (const d of depts) deptTotals.set(d.name, { cost: 0, color: d.color });
  for (const e of employees) {
    const name = e.department?.name;
    if (!name || !deptTotals.has(name)) continue;
    deptTotals.get(name)!.cost += (e.salary ?? 0) / 12;
  }

  return NextResponse.json({
    months: months.map((m) => ({ value: m, label: monthLabel(m) })),
    selectedMonth: selected,
    totalExpense,
    trend,
    breakdown: allRows.map((r) => ({ ...r, pct: totalExpense ? Math.round((r.amount / totalExpense) * 1000) / 10 : 0 })),
    costByDept: Array.from(deptTotals.entries()).map(([name, v]) => ({ name, cost: Math.round(v.cost), color: v.color })),
    budgetVsActual: allRows.filter((r) => r.budget != null).map((r) => ({ cat: r.name, budget: Math.round((r.budget ?? 0) / 1000), actual: Math.round(r.amount / 1000) })),
  });
}

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
        amount: r.amount,
        status: r.status,
      })),
    });
  }

  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const month = currentMonth();

  const [employees, records] = await Promise.all([
    prisma.employee.findMany({ where: { status: { not: "inactive" }, role: { not: "super_admin" } }, orderBy: { name: "asc" } }),
    prisma.payrollRecord.findMany({ where: { month } }),
  ]);
  const byEmployee = new Map(records.map((r) => [r.employeeId, r]));

  const rows = employees.map((e) => {
    const rec = byEmployee.get(e.id);
    return {
      employeeId: e.id,
      name: e.name,
      avatar: e.avatarInitials,
      avatarColor: e.avatarColor,
      amount: rec?.amount ?? 0,
      status: rec?.status ?? "pending",
      grantedAt: rec?.grantedAt ?? null,
    };
  });

  return NextResponse.json({
    month: monthLabel(month),
    paidCount: rows.filter((r) => r.status === "paid").length,
    totalCount: rows.length,
    employees: rows,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const employeeId = Number(body.employeeId);
  const amount = Math.round(Number(body.amount));
  if (!employeeId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "A valid employee and amount are required." }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  const month = currentMonth();
  const label = monthLabel(month);
  const now = new Date();

  await prisma.payrollRecord.upsert({
    where: { employeeId_month: { employeeId, month } },
    update: { amount, status: "paid", grantedById: user.id, grantedAt: now },
    create: { employeeId, month, amount, status: "paid", grantedById: user.id, grantedAt: now },
  });

  await notify(employeeId, "payroll", "Payroll processed", `Your payroll for ${label} has been granted.`, "payroll");
  await logAudit(user, `Granted ${label} payroll for ${employee.name}`, "Payroll");

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number((await params).id);
  const record = await prisma.payrollRecord.findUnique({ where: { id }, include: { employee: true } });
  if (!record) return NextResponse.json({ error: "Payroll record not found." }, { status: 404 });

  await prisma.payrollRecord.delete({ where: { id } });

  await logAudit(user, `Deleted ${monthLabel(record.month)} payroll for ${record.employee.name}`, "Payroll");

  return NextResponse.json({ ok: true });
}

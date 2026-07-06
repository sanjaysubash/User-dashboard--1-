import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { getAttendanceRates } from "@/lib/attendance";
import { formatDate } from "@/lib/format";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

async function wouldCreateCycle(employeeId: number, newManagerId: number): Promise<boolean> {
  let current: number | null = newManagerId;
  const seen = new Set<number>();
  while (current != null) {
    if (current === employeeId) return true;
    if (seen.has(current)) break;
    seen.add(current);
    const mgr: { managerId: number | null } | null = await prisma.employee.findUnique({ where: { id: current }, select: { managerId: true } });
    current = mgr?.managerId ?? null;
  }
  return false;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const employee = await prisma.employee.findUnique({ where: { id }, include: { department: true } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rates = await getAttendanceRates([id]);
  return NextResponse.json({
    employee: {
      id: employee.id,
      name: employee.name,
      role: employee.title,
      dept: employee.department?.name ?? "",
      email: employee.email,
      phone: employee.phone ?? "",
      location: employee.location ?? "",
      status: employee.status === "on_leave" ? "on-leave" : employee.status,
      avatar: employee.avatarInitials,
      avatarColor: employee.avatarColor,
      joined: formatDate(employee.joinedAt),
      salary: employee.salary ?? 0,
      attendance: rates[id] ?? 100,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number((await params).id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {
    ...(body.name ? { name: body.name } : {}),
    ...(body.title ? { title: body.title } : {}),
    ...(body.phone ? { phone: body.phone } : {}),
    ...(body.location ? { location: body.location } : {}),
    ...(body.status ? { status: body.status === "on-leave" ? "on_leave" : body.status } : {}),
    ...(body.salary ? { salary: Math.round(Number(body.salary)) } : {}),
  };

  if ("manager" in body) {
    if (body.manager) {
      const manager = await prisma.employee.findFirst({ where: { name: body.manager } });
      if (!manager) return NextResponse.json({ error: "Manager not found." }, { status: 400 });
      if (manager.id === id) return NextResponse.json({ error: "An employee cannot be their own manager." }, { status: 400 });
      if (await wouldCreateCycle(id, manager.id)) {
        return NextResponse.json({ error: "That change would create a reporting cycle." }, { status: 400 });
      }
      data.managerId = manager.id;
    } else {
      data.managerId = null;
    }
  }

  const employee = await prisma.employee.update({ where: { id }, data });

  await logAudit(user, `Updated employee profile "${employee.name}"`, "Employees");

  return NextResponse.json({ employee: { id: employee.id, name: employee.name } });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number((await params).id);
  const employee = await prisma.employee.update({ where: { id }, data: { status: "inactive" } });
  await logAudit(user, `Deactivated employee "${employee.name}"`, "Employees", "warning");
  return NextResponse.json({ ok: true });
}

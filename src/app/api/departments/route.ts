import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { getAttendanceRates } from "@/lib/attendance";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const departments = await prisma.department.findMany({
    include: { head: true, employees: true, projects: true },
    orderBy: { name: "asc" },
  });

  const allEmployeeIds = departments.flatMap((d) => d.employees.map((e) => e.id));
  const rates = await getAttendanceRates(allEmployeeIds);

  return NextResponse.json({
    departments: departments.map((d) => {
      const empRates = d.employees.map((e) => rates[e.id] ?? 100);
      const utilization = empRates.length ? Math.round(empRates.reduce((a, b) => a + b, 0) / empRates.length) : 0;
      return {
        id: d.id,
        name: d.name,
        head: d.head?.name ?? "Unassigned",
        employees: d.employees.length,
        members: d.employees.map((e) => ({ id: e.id, name: e.name, title: e.title, avatar: e.avatarInitials, avatarColor: e.avatarColor })),
        projects: d.projects.filter((p) => p.status !== "completed").length,
        budget: d.budget ?? 0,
        utilization,
        color: d.color,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  if (!name) return NextResponse.json({ error: "Department name is required." }, { status: 400 });

  const existing = await prisma.department.findUnique({ where: { name } });
  if (existing) return NextResponse.json({ error: "A department with this name already exists." }, { status: 409 });

  const head = body?.head ? await prisma.employee.findFirst({ where: { name: body.head } }) : null;

  try {
    const department = await prisma.department.create({
      data: {
        name,
        color: body?.color || "bg-indigo-500",
        budget: body?.budget ? Math.round(Number(body.budget)) : null,
        headId: head?.id ?? null,
      },
    });

    await logAudit(user, `Created department "${department.name}"`, "Departments");

    return NextResponse.json({ department: { id: department.id, name: department.name } }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "That employee already heads another department." }, { status: 409 });
    }
    throw e;
  }
}

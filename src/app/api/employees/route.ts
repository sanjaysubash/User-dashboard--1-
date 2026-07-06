import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin, hashPassword } from "@/lib/auth";
import { getAttendanceRates } from "@/lib/attendance";
import { formatDate } from "@/lib/format";
import { UI_TO_DB_ROLE, ROLE_LABELS } from "@/lib/roles";
import { logAudit } from "@/lib/audit";

function statusToUi(status: string) {
  return status === "on_leave" ? "on-leave" : status;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const dept = searchParams.get("dept")?.trim();

  const employees = await prisma.employee.findMany({
    where: {
      ...(dept && dept !== "All" ? { department: { name: dept } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { title: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    },
    include: { department: true },
    orderBy: { name: "asc" },
  });

  const rates = await getAttendanceRates(employees.map((e) => e.id));

  return NextResponse.json({
    employees: employees.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.title,
      dept: e.department?.name ?? "",
      email: e.email,
      phone: e.phone ?? "",
      location: e.location ?? "",
      status: statusToUi(e.status),
      avatar: e.avatarInitials,
      avatarColor: e.avatarColor,
      joined: formatDate(e.joinedAt),
      salary: e.salary ?? 0,
      attendance: rates[e.id] ?? 100,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const firstName = body?.firstName?.trim();
  const lastName = body?.lastName?.trim();
  const email = body?.email?.trim().toLowerCase();
  const jobTitle = body?.jobTitle?.trim();
  const deptName = body?.dept?.trim();
  const roleLevel = body?.roleLevel ?? "employee";

  if (!firstName || !email || !jobTitle) {
    return NextResponse.json({ error: "First name, email, and job title are required." }, { status: 400 });
  }

  const existing = await prisma.employee.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An employee with this email already exists." }, { status: 409 });

  const department = deptName ? await prisma.department.findUnique({ where: { name: deptName } }) : null;
  const dbRole = (UI_TO_DB_ROLE[roleLevel] ?? "employee") as Role;
  const name = `${firstName} ${lastName ?? ""}`.trim();
  const avatarInitials = (firstName[0] + (lastName?.[0] ?? "")).toUpperCase();
  const avatarColors = ["bg-indigo-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-teal-500"];
  const tempPassword = `Welcome@${new Date().getFullYear()}`;

  const employee = await prisma.employee.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(tempPassword),
      avatarInitials,
      avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
      role: dbRole,
      roleLabel: ROLE_LABELS[dbRole] ?? "Employee",
      title: jobTitle,
      phone: body?.phone || null,
      location: body?.workLoc || null,
      salary: body?.salary ? Math.round(Number(body.salary)) : null,
      permissions: JSON.stringify(["dashboard", "my-work", "tasks", "attendance", "leave", "profile"]),
      departmentId: department?.id ?? null,
    },
  });

  await logAudit(user, `Added employee "${employee.name}"`, "Employees");

  return NextResponse.json({ employee: { id: employee.id, name: employee.name, email: employee.email } }, { status: 201 });
}

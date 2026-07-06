import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { getAttendanceRates } from "@/lib/attendance";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teams = await prisma.team.findMany({
    include: { department: true, lead: true, members: { include: { employee: true } } },
    orderBy: { name: "asc" },
  });

  const allIds = teams.flatMap((t) => t.members.map((m) => m.employeeId));
  const rates = await getAttendanceRates(allIds);

  return NextResponse.json({
    teams: teams.map((t) => {
      const memberRates = t.members.map((m) => rates[m.employeeId] ?? 100);
      const velocity = memberRates.length ? Math.round(memberRates.reduce((a, b) => a + b, 0) / memberRates.length) : 0;
      return {
        id: t.id,
        name: t.name,
        dept: t.department.name,
        lead: t.lead?.name ?? "Unassigned",
        leadAvatar: t.lead?.avatarInitials ?? "?",
        leadColor: t.lead?.avatarColor ?? "bg-slate-500",
        members: t.members.map((m) => ({ i: m.employee.avatarInitials, c: m.employee.avatarColor })),
        size: t.members.length,
        projects: 0,
        velocity,
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
  if (!name) return NextResponse.json({ error: "Team name is required." }, { status: 400 });

  const department = await prisma.department.findFirst({ where: { name: body?.dept } });
  if (!department) return NextResponse.json({ error: "Unknown department." }, { status: 400 });

  const lead = body?.lead ? await prisma.employee.findFirst({ where: { name: body.lead } }) : null;

  const team = await prisma.team.create({
    data: { name, departmentId: department.id, leadId: lead?.id ?? null },
  });

  if (Array.isArray(body?.memberNames) && body.memberNames.length) {
    const members = await prisma.employee.findMany({ where: { name: { in: body.memberNames } } });
    if (members.length) {
      await prisma.teamMember.createMany({
        data: members.map((m) => ({ teamId: team.id, employeeId: m.id })),
      });
    }
  }

  return NextResponse.json({ team: { id: team.id, name: team.name } }, { status: 201 });
}

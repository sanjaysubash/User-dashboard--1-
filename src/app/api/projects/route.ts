import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberName = new URL(req.url).searchParams.get("memberName");

  const projects = await prisma.project.findMany({
    where: memberName
      ? { OR: [{ manager: { name: memberName } }, { members: { some: { employee: { name: memberName } } } }] }
      : {},
    include: { manager: true, members: true, tasks: true },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    projects: projects.map((p) => {
      const total = p.tasks.length;
      const completed = p.tasks.filter((t) => t.status === "done").length;
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        priority: p.priority,
        progress: total ? Math.round((completed / total) * 100) : 0,
        team: p.members.length,
        deadline: p.deadline ? formatDate(p.deadline) : "",
        budget: p.budget ?? 0,
        spent: p.spent,
        manager: p.manager?.name ?? "Unassigned",
        tasks: total,
        completed,
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
  if (!name) return NextResponse.json({ error: "Project name is required." }, { status: 400 });

  const department = body?.dept ? await prisma.department.findFirst({ where: { name: body.dept } }) : null;
  const manager = body?.manager ? await prisma.employee.findFirst({ where: { name: body.manager } }) : null;

  const project = await prisma.project.create({
    data: {
      name,
      code: body?.code || null,
      client: body?.client || null,
      departmentId: department?.id ?? null,
      managerId: manager?.id ?? null,
      priority: body?.priority || "medium",
      status: body?.status || "planning",
      description: body?.desc || null,
      startDate: body?.startDate ? new Date(body.startDate) : null,
      deadline: body?.deadline ? new Date(body.deadline) : null,
      budget: body?.budget ? Math.round(Number(body.budget)) : null,
      details: body?.milestones ? JSON.stringify(body.milestones) : null,
    },
  });

  if (Array.isArray(body?.memberNames) && body.memberNames.length) {
    const members = await prisma.employee.findMany({ where: { name: { in: body.memberNames } } });
    if (members.length) {
      await prisma.projectMember.createMany({
        data: members.map((m) => ({ projectId: project.id, employeeId: m.id })),
      });
    }
  }

  await logAudit(user, `Created project "${project.name}"`, "Projects");

  return NextResponse.json({ project: { id: project.id, name: project.name } }, { status: 201 });
}

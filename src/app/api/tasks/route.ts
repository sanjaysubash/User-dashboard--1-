import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assigneeName = new URL(req.url).searchParams.get("assignee");

  const tasks = await prisma.task.findMany({
    where: assigneeName ? { assignee: { name: assigneeName } } : {},
    include: { project: true, assignee: true, assignedBy: true },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      project: t.project?.name ?? "",
      assigneeId: t.assigneeId,
      assignee: t.assignee?.name ?? "Unassigned",
      assigneeAvatar: t.assignee?.avatarInitials ?? "?",
      assigneeColor: t.assignee?.avatarColor ?? "bg-slate-500",
      assignedById: t.assignedById,
      assignedBy: t.assignedBy?.name ?? "",
      assignedByAvatar: t.assignedBy?.avatarInitials ?? "?",
      priority: t.priority,
      status: t.status,
      due: t.dueDate ? formatDate(t.dueDate) : "",
      tags: JSON.parse(t.tags || "[]"),
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = body?.title?.trim();
  if (!title) return NextResponse.json({ error: "Task title is required." }, { status: 400 });

  const dueDate = body?.dueDate ? new Date(body.dueDate) : null;
  if (dueDate && isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: "Invalid due date." }, { status: 400 });
  }
  if (dueDate && dueDate.getTime() < new Date(new Date().setHours(0, 0, 0, 0)).getTime()) {
    return NextResponse.json({ error: "Due date cannot be in the past." }, { status: 400 });
  }

  const project = body?.project ? await prisma.project.findFirst({ where: { name: body.project } }) : null;
  const assignee = body?.assignee ? await prisma.employee.findFirst({ where: { name: body.assignee } }) : null;

  const task = await prisma.task.create({
    data: {
      title,
      projectId: project?.id ?? null,
      assigneeId: assignee?.id ?? null,
      assignedById: user.id,
      priority: body?.priority || "medium",
      status: body?.status || "todo",
      dueDate,
      tags: JSON.stringify(Array.isArray(body?.tags) ? body.tags : []),
      description: body?.desc || null,
      estimateHours: body?.estimate ? Number(body.estimate) : null,
    },
  });

  await prisma.taskActivity.create({
    data: {
      taskId: task.id,
      actorId: user.id,
      action: "created",
      detail: assignee ? `Created and assigned to ${assignee.name}` : "Created, unassigned",
    },
  });

  if (assignee && assignee.id !== user.id) {
    await notify(assignee.id, "task", "Task assigned to you", `${user.name} assigned "${title}"${project ? ` in ${project.name}` : ""}`, "tasks");
  }
  await logAudit(user, `Created task "${title}"`, "Tasks");

  return NextResponse.json({ task: { id: task.id, title: task.title } }, { status: 201 });
}

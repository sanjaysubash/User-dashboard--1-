import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canViewAllTasks } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { sendMail } from "@/lib/mail";

function parseAssigneeIds(json: string): number[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assigneeName = new URL(req.url).searchParams.get("assignee");

  // assigneeIds is a JSON column (no relation), so "is this user an assignee"
  // can't be expressed in the Prisma where clause — fetch all tasks and scope
  // in JS, same approach as the attendeeIds handling in the meetings/calendar routes.
  const allTasks = await prisma.task.findMany({
    include: { project: true, assignedBy: true },
    orderBy: { id: "asc" },
  });

  const employeeIds = Array.from(new Set(allTasks.flatMap((t) => parseAssigneeIds(t.assigneeIds))));
  const employees = employeeIds.length ? await prisma.employee.findMany({ where: { id: { in: employeeIds } } }) : [];
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  // Non-admins only ever see tasks they're assigned to or assigned; the manager
  // hierarchy and super_admin can see everything.
  let tasks = canViewAllTasks(user)
    ? allTasks
    : allTasks.filter((t) => t.assignedById === user.id || parseAssigneeIds(t.assigneeIds).includes(user.id));

  if (assigneeName) {
    tasks = tasks.filter((t) => parseAssigneeIds(t.assigneeIds).some((id) => employeeById.get(id)?.name === assigneeName));
  }

  return NextResponse.json({
    tasks: tasks.map((t) => {
      const assignees = parseAssigneeIds(t.assigneeIds)
        .map((id) => employeeById.get(id))
        .filter((e): e is NonNullable<typeof e> => !!e)
        .map((e) => ({ id: e.id, name: e.name, avatar: e.avatarInitials, color: e.avatarColor }));
      return {
        id: t.id,
        title: t.title,
        project: t.project?.name ?? "",
        assigneeIds: assignees.map((a) => a.id),
        assignees,
        assignedById: t.assignedById,
        assignedBy: t.assignedBy?.name ?? "",
        assignedByAvatar: t.assignedBy?.avatarInitials ?? "?",
        priority: t.priority,
        status: t.status,
        due: t.dueDate ? formatDate(t.dueDate) : "",
        tags: JSON.parse(t.tags || "[]"),
      };
    }),
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

  const assigneeNames: string[] = Array.isArray(body?.assigneeNames) ? body.assigneeNames : (body?.assignee ? [body.assignee] : []);
  if (!assigneeNames.length) return NextResponse.json({ error: "Assign at least one person before creating the task." }, { status: 400 });
  const assignees = await prisma.employee.findMany({ where: { name: { in: assigneeNames } } });
  if (!assignees.length) return NextResponse.json({ error: "Unknown assignee." }, { status: 400 });

  const task = await prisma.task.create({
    data: {
      title,
      projectId: project?.id ?? null,
      assigneeIds: JSON.stringify(assignees.map((a) => a.id)),
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
      detail: assignees.length ? `Created and assigned to ${assignees.map((a) => a.name).join(", ")}` : "Created, unassigned",
    },
  });

  const notifyAssignees = assignees.filter((a) => a.id !== user.id);
  await Promise.all(
    notifyAssignees.map((a) => notify(a.id, "task", "Task assigned to you", `${user.name} assigned "${title}"${project ? ` in ${project.name}` : ""}`, "tasks"))
  );

  // Optional email alert on creation, gated by a checkbox the creator ticks —
  // same opt-in pattern as the EOD "mark important" flag.
  let emailSent: boolean | null = null;
  if (body?.sendAlert && notifyAssignees.length) {
    emailSent = await sendMail(
      notifyAssignees.map((a) => a.email),
      `Task assigned: "${title}"`,
      `<p><strong>${user.name}</strong> assigned you the task <strong>"${title}"</strong>${project ? ` in ${project.name}` : ""}.</p><p><strong>Priority:</strong> ${body?.priority || "medium"}${dueDate ? ` &middot; <strong>Due:</strong> ${dueDate.toLocaleDateString()}` : ""}</p>`
    );
  }

  await logAudit(user, `Created task "${title}"`, "Tasks");

  return NextResponse.json({ task: { id: task.id, title: task.title }, emailSent }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canViewAllTasks } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { statusLabel } from "@/lib/tasks";

type Params = { params: Promise<{ id: string }> };

function timeAgo(d: Date) {
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function parseAssigneeIds(json: string): number[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

async function loadTask(id: number) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      project: true,
      assignedBy: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      activity: { include: { actor: true }, orderBy: { createdAt: "asc" } },
    },
  });
}

async function loadAssignees(task: { assigneeIds: string }) {
  const ids = parseAssigneeIds(task.assigneeIds);
  if (!ids.length) return [];
  const employees = await prisma.employee.findMany({ where: { id: { in: ids } } });
  return employees.map((e) => ({ id: e.id, name: e.name, avatar: e.avatarInitials, color: e.avatarColor }));
}

async function serialize(task: NonNullable<Awaited<ReturnType<typeof loadTask>>>) {
  const assignees = await loadAssignees(task);
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    project: task.project?.name ?? "",
    priority: task.priority,
    status: task.status,
    due: task.dueDate ? formatDate(task.dueDate) : "",
    estimateHours: task.estimateHours,
    tags: JSON.parse(task.tags || "[]"),
    assigneeIds: assignees.map((a) => a.id),
    assignees,
    assignedBy: task.assignedBy ? { id: task.assignedBy.id, name: task.assignedBy.name, avatar: task.assignedBy.avatarInitials, color: task.assignedBy.avatarColor } : null,
    createdAt: formatDate(task.createdAt),
    comments: task.comments.map((c) => ({
      id: c.id,
      author: c.author.name,
      avatar: c.author.avatarInitials,
      color: c.author.avatarColor,
      content: c.content,
      time: timeAgo(c.createdAt),
    })),
    activity: task.activity.map((a) => ({
      id: a.id,
      actor: a.actor?.name ?? "System",
      action: a.action,
      detail: a.detail,
      time: timeAgo(a.createdAt),
    })),
  };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const task = await loadTask(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAssignee = parseAssigneeIds(task.assigneeIds).includes(user.id);
  const canView = isAssignee || task.assignedById === user.id || canViewAllTasks(user);
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ task: await serialize(task) });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const task = await loadTask(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentAssigneeIds = parseAssigneeIds(task.assigneeIds);
  const isAssignee = currentAssigneeIds.includes(user.id);
  const isAssigner = task.assignedById === user.id;
  const isAdmin = canViewAllTasks(user);
  const canEditFull = isAssigner || isAdmin;
  if (!isAssignee && !canEditFull) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const keys = Object.keys(body);
  if (!canEditFull && keys.some((k) => k !== "status")) {
    return NextResponse.json({ error: "You can only update this task's status." }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  const activityEntries: { action: string; detail: string }[] = [];
  let newlyAddedAssignees: { id: number; name: string }[] = [];

  if ("status" in body) {
    const status = body.status;
    if (!["todo", "in-progress", "review", "done"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    if (status !== task.status) {
      updateData.status = status;
      activityEntries.push({ action: "status_changed", detail: `${statusLabel(task.status)} → ${statusLabel(status)}` });
    }
  }

  if (canEditFull) {
    if ("title" in body) {
      const title = body.title?.trim();
      if (!title) return NextResponse.json({ error: "Task title is required." }, { status: 400 });
      updateData.title = title;
    }
    if ("desc" in body) updateData.description = body.desc || null;
    if ("priority" in body) updateData.priority = body.priority;
    if ("estimate" in body) updateData.estimateHours = body.estimate ? Number(body.estimate) : null;
    if ("dueDate" in body) {
      const dueDate = body.dueDate ? new Date(body.dueDate) : null;
      if (dueDate && isNaN(dueDate.getTime())) return NextResponse.json({ error: "Invalid due date." }, { status: 400 });
      if (dueDate && dueDate.getTime() < new Date(new Date().setHours(0, 0, 0, 0)).getTime()) {
        return NextResponse.json({ error: "Due date cannot be in the past." }, { status: 400 });
      }
      updateData.dueDate = dueDate;
    }
    if ("assignees" in body) {
      const names: string[] = Array.isArray(body.assignees) ? body.assignees : [];
      if (!names.length) return NextResponse.json({ error: "A task must have at least one assignee." }, { status: 400 });
      const matches = await prisma.employee.findMany({ where: { name: { in: names } } });
      if (!matches.length) return NextResponse.json({ error: "Unknown assignee." }, { status: 400 });
      const newIds = matches.map((m) => m.id);
      const sameSet = newIds.length === currentAssigneeIds.length && newIds.every((i) => currentAssigneeIds.includes(i));
      if (!sameSet) {
        updateData.assigneeIds = JSON.stringify(newIds);
        activityEntries.push({ action: "reassigned", detail: matches.length ? `Assigned to ${matches.map((m) => m.name).join(", ")}` : "Unassigned" });
        newlyAddedAssignees = matches.filter((m) => !currentAssigneeIds.includes(m.id) && m.id !== user.id).map((m) => ({ id: m.id, name: m.name }));
      }
    }
  }

  if (Object.keys(updateData).length === 0 && activityEntries.length === 0) {
    return NextResponse.json({ task: await serialize(task) });
  }

  await prisma.task.update({ where: { id }, data: updateData });
  for (const entry of activityEntries) {
    await prisma.taskActivity.create({ data: { taskId: id, actorId: user.id, action: entry.action, detail: entry.detail } });
  }

  for (const a of newlyAddedAssignees) {
    await notify(a.id, "task", "Task assigned to you", `${user.name} assigned "${task.title}" to you`, "tasks");
  }

  if (updateData.status) {
    // Notify everyone else involved in the task: the other assignees, and the
    // assigner if the actor is one of the assignees (or vice versa).
    const notifyTargets = new Set<number>(currentAssigneeIds);
    if (task.assignedById) notifyTargets.add(task.assignedById);
    notifyTargets.delete(user.id);
    await Promise.all(
      Array.from(notifyTargets).map((targetId) =>
        notify(targetId, "task", "Task status updated", `${user.name} moved "${task.title}" to ${statusLabel(updateData.status as string)}.`, "tasks")
      )
    );
  }
  await logAudit(user, `Updated task "${task.title}"`, "Tasks");

  const updated = await loadTask(id);
  return NextResponse.json({ task: await serialize(updated!) });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (task.assignedById !== user.id && !canViewAllTasks(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assigneeIds = parseAssigneeIds(task.assigneeIds).filter((aid) => aid !== user.id);
  await Promise.all(assigneeIds.map((aid) => notify(aid, "task", "Task deleted", `"${task.title}" was deleted by ${user.name}.`, "tasks")));

  await prisma.taskComment.deleteMany({ where: { taskId: id } });
  await prisma.taskActivity.deleteMany({ where: { taskId: id } });
  await prisma.task.delete({ where: { id } });
  await logAudit(user, `Deleted task "${task.title}"`, "Tasks");

  return NextResponse.json({ ok: true });
}

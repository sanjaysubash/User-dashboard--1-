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

async function loadTask(id: number) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      project: true,
      assignee: true,
      assignedBy: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      activity: { include: { actor: true }, orderBy: { createdAt: "asc" } },
    },
  });
}

function serialize(task: NonNullable<Awaited<ReturnType<typeof loadTask>>>) {
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
    assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.name, avatar: task.assignee.avatarInitials, color: task.assignee.avatarColor } : null,
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

  const canView = task.assigneeId === user.id || task.assignedById === user.id || canViewAllTasks(user);
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ task: serialize(task) });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const task = await loadTask(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAssignee = task.assigneeId === user.id;
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
    if ("assignee" in body) {
      const newAssignee = body.assignee ? await prisma.employee.findFirst({ where: { name: body.assignee } }) : null;
      if (body.assignee && !newAssignee) return NextResponse.json({ error: "Unknown assignee." }, { status: 400 });
      if ((newAssignee?.id ?? null) !== task.assigneeId) {
        updateData.assigneeId = newAssignee?.id ?? null;
        activityEntries.push({ action: "reassigned", detail: newAssignee ? `Reassigned to ${newAssignee.name}` : "Unassigned" });
        if (newAssignee && newAssignee.id !== user.id) {
          await notify(newAssignee.id, "task", "Task assigned to you", `${user.name} assigned "${task.title}" to you`, "tasks");
        }
      }
    }
  }

  if (Object.keys(updateData).length === 0 && activityEntries.length === 0) {
    return NextResponse.json({ task: serialize(task) });
  }

  await prisma.task.update({ where: { id }, data: updateData });
  for (const entry of activityEntries) {
    await prisma.taskActivity.create({ data: { taskId: id, actorId: user.id, action: entry.action, detail: entry.detail } });
  }

  if (updateData.status) {
    const notifyTargetId = isAssignee ? task.assignedById : task.assigneeId;
    if (notifyTargetId && notifyTargetId !== user.id) {
      await notify(notifyTargetId, "task", "Task status updated", `${user.name} moved "${task.title}" to ${statusLabel(updateData.status as string)}.`, "tasks");
    }
  }
  await logAudit(user, `Updated task "${task.title}"`, "Tasks");

  const updated = await loadTask(id);
  return NextResponse.json({ task: serialize(updated!) });
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

  if (task.assigneeId && task.assigneeId !== user.id) {
    await notify(task.assigneeId, "task", "Task deleted", `"${task.title}" was deleted by ${user.name}.`, "tasks");
  }
  await prisma.taskComment.deleteMany({ where: { taskId: id } });
  await prisma.taskActivity.deleteMany({ where: { taskId: id } });
  await prisma.task.delete({ where: { id } });
  await logAudit(user, `Deleted task "${task.title}"`, "Tasks");

  return NextResponse.json({ ok: true });
}

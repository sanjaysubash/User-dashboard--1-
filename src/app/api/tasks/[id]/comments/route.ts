import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canViewAllTasks } from "@/lib/auth";
import { notify } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

function parseAssigneeIds(json: string): number[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assigneeIds = parseAssigneeIds(task.assigneeIds);
  const canView = assigneeIds.includes(user.id) || task.assignedById === user.id || canViewAllTasks(user);
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const content = body?.content?.trim();
  if (!content) return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });

  await prisma.taskComment.create({ data: { taskId: id, authorId: user.id, content } });
  await prisma.taskActivity.create({ data: { taskId: id, actorId: user.id, action: "commented", detail: null } });

  const notifyTargets = new Set<number>(assigneeIds);
  if (task.assignedById) notifyTargets.add(task.assignedById);
  notifyTargets.delete(user.id);
  await Promise.all(
    Array.from(notifyTargets).map((targetId) => notify(targetId, "task", "New comment on your task", `${user.name} commented on "${task.title}"`, "tasks"))
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}

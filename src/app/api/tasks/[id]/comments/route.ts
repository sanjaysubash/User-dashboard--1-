import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notify } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const content = body?.content?.trim();
  if (!content) return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });

  await prisma.taskComment.create({ data: { taskId: id, authorId: user.id, content } });
  await prisma.taskActivity.create({ data: { taskId: id, actorId: user.id, action: "commented", detail: null } });

  const notifyTargetId = user.id === task.assigneeId ? task.assignedById : task.assigneeId;
  if (notifyTargetId && notifyTargetId !== user.id) {
    await notify(notifyTargetId, "task", "New comment on your task", `${user.name} commented on "${task.title}"`, "tasks");
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

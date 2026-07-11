import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canViewAllTasks } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { sendMail } from "@/lib/mail";
import { statusLabel } from "@/lib/tasks";

type Params = { params: Promise<{ id: string }> };

function parseAssigneeIds(json: string): number[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

// Lets the creator or any assignee flag an update on a task as important
// enough to email everyone else involved, independent of a status change.
export async function POST(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const task = await prisma.task.findUnique({ where: { id }, include: { assignedBy: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assigneeIds = parseAssigneeIds(task.assigneeIds);
  const isAssignee = assigneeIds.includes(user.id);
  const isAssigner = task.assignedById === user.id;
  if (!isAssignee && !isAssigner && !canViewAllTasks(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recipientIds = new Set<number>(assigneeIds);
  if (task.assignedById) recipientIds.add(task.assignedById);
  recipientIds.delete(user.id);

  if (recipientIds.size === 0) {
    return NextResponse.json({ error: "There's no one else on this task to alert." }, { status: 400 });
  }

  const recipients = await prisma.employee.findMany({ where: { id: { in: Array.from(recipientIds) } } });

  const subject = `Task alert: "${task.title}"`;
  const html = `<p><strong>${user.name}</strong> flagged an update on <strong>"${task.title}"</strong> as important.</p><p><strong>Status:</strong> ${statusLabel(task.status)} &middot; <strong>Priority:</strong> ${task.priority}</p>`;

  const emailSent = await sendMail(recipients.map((r) => r.email), subject, html);
  await Promise.all(recipients.map((r) => notify(r.id, "task", "Task alert", `${user.name} flagged "${task.title}" as important.`, "tasks")));

  return NextResponse.json({ ok: true, sentTo: recipients.length, emailSent });
}

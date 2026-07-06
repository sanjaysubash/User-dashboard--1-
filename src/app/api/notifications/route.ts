import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkMissedPunchOuts } from "@/lib/attendance";
import { checkTaskDueReminders } from "@/lib/tasks";

const ICON_BY_TYPE: Record<string, string> = {
  task: "task",
  leave: "leave",
  project: "project",
  payroll: "payroll",
  meeting: "meeting",
  performance: "performance",
  attendance: "attendance",
};

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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await checkMissedPunchOuts(user.id);
  await checkTaskDueReminders(user.id);

  const notifications = await prisma.notification.findMany({
    where: { employeeId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      icon: ICON_BY_TYPE[n.type] ?? "task",
      title: n.title,
      body: n.body,
      time: timeAgo(n.createdAt),
      read: n.read,
      link: n.link,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.markAll) {
    await prisma.notification.updateMany({ where: { employeeId: user.id, read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
  }

  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "Notification id is required." }, { status: 400 });
  await prisma.notification.updateMany({ where: { id, employeeId: user.id }, data: { read: true } });
  return NextResponse.json({ ok: true });
}

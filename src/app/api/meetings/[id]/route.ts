import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canApprove } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (meeting.createdById !== user.id && !canApprove(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const attendeeIds: number[] = JSON.parse(meeting.attendeeIds || "[]");
  await prisma.meeting.delete({ where: { id } });

  await Promise.all(
    attendeeIds
      .filter((employeeId) => employeeId !== user.id)
      .map((employeeId) => notify(employeeId, "meeting", "Meeting cancelled", `"${meeting.title}" (${meeting.startTime} — ${meeting.endTime}) has been cancelled by ${user.name}.`, "meetings"))
  );
  await logAudit(user, `Cancelled meeting "${meeting.title}"`, "Meetings");

  return NextResponse.json({ ok: true });
}

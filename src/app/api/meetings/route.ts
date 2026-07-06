import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meetings = await prisma.meeting.findMany({ orderBy: { date: "asc" } });
  const employees = await prisma.employee.findMany({ select: { id: true, avatarInitials: true } });
  const initialsById = new Map(employees.map((e) => [e.id, e.avatarInitials]));
  const now = new Date();

  return NextResponse.json({
    meetings: meetings.map((m) => {
      const attendeeIds: number[] = JSON.parse(m.attendeeIds || "[]");
      const isToday = m.date.toDateString() === now.toDateString();
      const status = m.recurrence !== "none" ? "recurring" : m.date >= now || isToday ? "upcoming" : "completed";
      return {
        id: m.id,
        title: m.title,
        date: isToday ? `Today, ${formatDate(m.date)}` : formatDate(m.date),
        time: `${m.startTime} — ${m.endTime}`,
        attendees: attendeeIds.map((id) => initialsById.get(id) ?? "?"),
        attendeeIds,
        status,
        gmeetLink: m.gmeetLink,
        createdById: m.createdById,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = body?.title?.trim();
  const date = body?.date ? new Date(body.date) : null;
  if (!title || !date || isNaN(date.getTime())) {
    return NextResponse.json({ error: "Title and date are required." }, { status: 400 });
  }

  const startTime = body?.startTime || "10:00";
  const endTime = body?.endTime || "11:00";
  if (endTime <= startTime) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const meetingStart = new Date(date);
  meetingStart.setHours(startHour, startMinute, 0, 0);
  if (meetingStart.getTime() < Date.now()) {
    return NextResponse.json({ error: "Cannot schedule a meeting in the past." }, { status: 400 });
  }

  let attendeeIds: number[] = [];
  if (Array.isArray(body?.attendeeNames) && body.attendeeNames.length) {
    const matches = await prisma.employee.findMany({ where: { name: { in: body.attendeeNames } } });
    attendeeIds = matches.map((m) => m.id);
  }

  const meeting = await prisma.meeting.create({
    data: {
      title,
      date,
      startTime,
      endTime,
      type: body?.type || "video",
      gmeetLink: body?.gmeetLink || null,
      room: body?.room || null,
      agenda: body?.agenda || null,
      recurrence: body?.recurrence || "none",
      attendeeIds: JSON.stringify(attendeeIds),
      createdById: user.id,
    },
  });

  if (body?.sendInvites !== false) {
    for (const id of attendeeIds) {
      await prisma.notification.create({
        data: { employeeId: id, type: "meeting", title: "Meeting invite", body: `${user.name} invited you to "${title}"`, link: "meetings" },
      });
    }
  }
  await logAudit(user, `Scheduled meeting "${title}"`, "Meetings");

  return NextResponse.json({ meeting: { id: meeting.id, title: meeting.title } }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getFullYear();
  const month = Number(searchParams.get("month")) || now.getMonth() + 1; // 1-12

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const [monthEvents, upcoming] = await Promise.all([
    prisma.calendarEvent.findMany({ where: { date: { gte: monthStart, lt: monthEnd } }, orderBy: { date: "asc" } }),
    prisma.calendarEvent.findMany({ where: { date: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } }, orderBy: { date: "asc" }, take: 8 }),
  ]);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysAway = (d: Date) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - today.getTime()) / 86400000);

  return NextResponse.json({
    year, month,
    daysInMonth: new Date(year, month, 0).getDate(),
    events: monthEvents.map((e) => ({ id: e.id, day: e.date.getDate(), title: e.title, type: e.type, description: e.description })),
    upcoming: upcoming.map((e) => ({ id: e.id, day: e.date.getDate(), month: e.date.getMonth() + 1, title: e.title, type: e.type, description: e.description, daysAway: daysAway(e.date) })),
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

  let attendeeIds: number[] = [];
  if (Array.isArray(body?.attendeeNames) && body.attendeeNames.length) {
    const matches = await prisma.employee.findMany({ where: { name: { in: body.attendeeNames } } });
    attendeeIds = matches.map((m) => m.id);
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title,
      date,
      startTime: body?.allDay ? null : body?.startTime || null,
      endTime: body?.allDay ? null : body?.endTime || null,
      allDay: !!body?.allDay,
      type: body?.type || "event",
      color: body?.color || "bg-indigo-500",
      description: body?.desc || null,
      location: body?.location || null,
      link: body?.link || null,
      attendeeIds: JSON.stringify(attendeeIds),
      createdById: user.id,
    },
  });

  await logAudit(user, `Created calendar event "${title}"`, "Calendar");

  return NextResponse.json({ event: { id: event.id, title: event.title } }, { status: 201 });
}

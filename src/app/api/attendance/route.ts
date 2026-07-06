import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canApprove } from "@/lib/auth";
import { getAttendanceRates } from "@/lib/attendance";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
const LATE_CUTOFF_HOUR = 9.25; // 09:15

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employeeIdParam = new URL(req.url).searchParams.get("employeeId");
  const targetId = employeeIdParam ? Number(employeeIdParam) : user.id;
  if (targetId !== user.id && !canApprove(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const today = startOfDay(now);
  const monthStart = startOfMonth(now);

  const todayRow = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: targetId, date: today } },
  });

  const monthRows = await prisma.attendance.findMany({
    where: { employeeId: targetId, date: { gte: monthStart } },
    orderBy: { date: "asc" },
  });

  const presentDays = monthRows.filter((r) => r.status !== "absent").length;
  const lateArrivals = monthRows.filter((r) => r.status === "late").length;
  const hoursLogged = monthRows.filter((r) => r.hoursWorked != null).map((r) => r.hoursWorked as number);
  const avgHours = hoursLogged.length ? hoursLogged.reduce((a, b) => a + b, 0) / hoursLogged.length : 0;

  const hoursToday = todayRow?.punchOut
    ? todayRow.hoursWorked ?? 0
    : todayRow?.punchIn
      ? (now.getTime() - new Date(todayRow.punchIn).getTime()) / 3600000
      : 0;

  // Cross-employee attendance visibility is restricted to super_admin
  // (Aashika N and Venkat B) — everyone else only ever sees their own data above.
  let team: unknown[] = [];
  let todayAll: unknown[] = [];
  if (canApprove(user)) {
    const allEmployees = await prisma.employee.findMany({
      orderBy: { name: "asc" },
      include: { department: true },
    });
    const rates = await getAttendanceRates(allEmployees.map((t) => t.id));
    team = allEmployees.map((t) => ({
      id: t.id,
      name: t.name,
      dept: t.department?.name ?? "",
      avatar: t.avatarInitials,
      avatarColor: t.avatarColor,
      attendance: rates[t.id] ?? 100,
    }));

    const todayRows = await prisma.attendance.findMany({ where: { date: today } });
    const todayRowByEmployee = new Map(todayRows.map((r) => [r.employeeId, r]));
    todayAll = allEmployees.map((t) => {
      const row = todayRowByEmployee.get(t.id);
      return {
        id: t.id,
        name: t.name,
        dept: t.department?.name ?? "",
        avatar: t.avatarInitials,
        avatarColor: t.avatarColor,
        punchedIn: !!row?.punchIn && !row?.punchOut,
        punchInTime: row?.punchIn ?? null,
        punchOutTime: row?.punchOut ?? null,
        status: row?.status ?? "not-punched-in",
      };
    });
  }

  return NextResponse.json({
    today: {
      punchedIn: !!todayRow?.punchIn && !todayRow?.punchOut,
      punchInTime: todayRow?.punchIn ?? null,
      punchOutTime: todayRow?.punchOut ?? null,
      hoursToday: Math.round(hoursToday * 100) / 100,
    },
    monthly: {
      presentDays,
      totalRecorded: monthRows.length,
      avgHours: Math.round(avgHours * 10) / 10,
      lateArrivals,
    },
    heatmap: monthRows.map((r) => ({ day: new Date(r.date).getDate(), present: r.status !== "absent", late: r.status === "late" })),
    log: monthRows.slice(-15).reverse().map((r) => ({
      date: r.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      in: r.punchIn ? new Date(r.punchIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—",
      out: r.punchOut ? new Date(r.punchOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—",
      hours: r.hoursWorked != null ? `${r.hoursWorked.toFixed(1)}h` : "—",
      status: r.status,
    })),
    team,
    todayAll,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (action !== "in" && action !== "out") {
    return NextResponse.json({ error: "action must be 'in' or 'out'." }, { status: 400 });
  }

  const now = new Date();
  const today = startOfDay(now);

  if (action === "in") {
    const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } });
    if (existing?.punchIn) return NextResponse.json({ error: "Already punched in today." }, { status: 409 });
    const status = now.getHours() + now.getMinutes() / 60 > LATE_CUTOFF_HOUR ? "late" : "present";
    await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: user.id, date: today } },
      create: { employeeId: user.id, date: today, punchIn: now, status },
      update: { punchIn: now, status, punchOut: null, hoursWorked: null },
    });
  } else {
    const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } });
    if (!existing?.punchIn) return NextResponse.json({ error: "You haven't punched in today." }, { status: 409 });
    if (existing.punchOut) return NextResponse.json({ error: "Already punched out today." }, { status: 409 });
    const hoursWorked = (now.getTime() - new Date(existing.punchIn).getTime()) / 3600000;
    await prisma.attendance.update({
      where: { employeeId_date: { employeeId: user.id, date: today } },
      data: { punchOut: now, hoursWorked: Math.round(hoursWorked * 100) / 100 },
    });
  }

  return NextResponse.json({ ok: true });
}

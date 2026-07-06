import { prisma } from "./prisma";
import { notify } from "./notify";
import { formatDate } from "./format";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Finds past days (not today — today may still be in progress) where the
// employee punched in but never punched out, and sends a one-time reminder
// notification per missed day. Called opportunistically (e.g. on notification
// poll) rather than via a midnight cron, so it fires the next time the app is
// open rather than at an exact wall-clock moment.
export async function checkMissedPunchOuts(employeeId: number) {
  const today = startOfDay(new Date());
  const openDays = await prisma.attendance.findMany({
    where: { employeeId, date: { lt: today }, punchIn: { not: null }, punchOut: null },
  });
  for (const day of openDays) {
    const dateLabel = formatDate(day.date);
    const already = await prisma.notification.findFirst({
      where: { employeeId, type: "attendance", body: { contains: dateLabel } },
    });
    if (already) continue;
    await notify(
      employeeId,
      "attendance",
      "You forgot to punch out",
      `You punched in on ${dateLabel} but never punched out. Contact Aashika or Venkat if this needs correcting.`,
      "attendance"
    );
  }
}

// Attendance rate (%) per employee over the last 30 days, keyed by employeeId.
export async function getAttendanceRates(employeeIds?: number[]): Promise<Record<number, number>> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const rows = await prisma.attendance.groupBy({
    by: ["employeeId", "status"],
    _count: { _all: true },
    where: {
      date: { gte: since },
      ...(employeeIds ? { employeeId: { in: employeeIds } } : {}),
    },
  });

  const totals: Record<number, number> = {};
  const present: Record<number, number> = {};
  for (const row of rows) {
    totals[row.employeeId] = (totals[row.employeeId] ?? 0) + row._count._all;
    if (row.status !== "absent") {
      present[row.employeeId] = (present[row.employeeId] ?? 0) + row._count._all;
    }
  }

  const rates: Record<number, number> = {};
  const ids = employeeIds ?? Object.keys(totals).map(Number);
  for (const id of ids) {
    const total = totals[id] ?? 0;
    rates[id] = total > 0 ? Math.round(((present[id] ?? 0) / total) * 100) : 100;
  }
  return rates;
}

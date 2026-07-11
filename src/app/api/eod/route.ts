import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { sendMail } from "@/lib/mail";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function countWeekdays(start: Date, end: Date) {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function parseTaskIds(json: string): number[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

type Attachment = { name: string; url: string; size: number; type: string };

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB, mirrors /api/eod/upload
const ALLOWED_ATTACHMENT_HOST = "res.cloudinary.com";

function parseAttachments(json: string): Attachment[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// The DB only ever stores this JSON (name/url/size/type) — never file bytes.
// This validation is what actually prevents someone from smuggling a data:
// URL or an oversized payload into that JSON and bloating the DB anyway.
function sanitizeAttachments(input: unknown): { attachments: Attachment[]; error?: string } {
  if (input === undefined) return { attachments: [] };
  if (!Array.isArray(input)) return { attachments: [], error: "Invalid attachments." };
  if (input.length > MAX_ATTACHMENTS) return { attachments: [], error: `You can attach at most ${MAX_ATTACHMENTS} files.` };

  const attachments: Attachment[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return { attachments: [], error: "Invalid attachment." };
    const { name, url, size, type } = item as Record<string, unknown>;
    if (typeof url !== "string" || !url.startsWith(`https://${ALLOWED_ATTACHMENT_HOST}/`)) {
      return { attachments: [], error: "Attachments must be uploaded via the file picker." };
    }
    if (typeof size !== "number" || size < 0 || size > MAX_ATTACHMENT_BYTES) {
      return { attachments: [], error: "Attachment exceeds the 5MB size limit." };
    }
    if (typeof name !== "string" || typeof type !== "string") return { attachments: [], error: "Invalid attachment." };
    attachments.push({ name: name.slice(0, 200), url, size, type });
  }
  return { attachments };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = startOfDay(new Date());
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [todayReport, history, monthReports] = await Promise.all([
    prisma.eODReport.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } }),
    prisma.eODReport.findMany({ where: { employeeId: user.id }, orderBy: { date: "desc" }, take: 10 }),
    prisma.eODReport.findMany({ where: { employeeId: user.id, date: { gte: monthStart, lte: today } }, select: { date: true } }),
  ]);

  const allTaskIds = Array.from(new Set([...(todayReport ? parseTaskIds(todayReport.taskIds) : []), ...history.flatMap((r) => parseTaskIds(r.taskIds))]));
  const tasks = allTaskIds.length ? await prisma.task.findMany({ where: { id: { in: allTaskIds } }, select: { id: true, title: true } }) : [];
  const taskTitle = new Map(tasks.map((t) => [t.id, t.title]));
  const resolve = (ids: number[]) => ids.map((id) => taskTitle.get(id)).filter((t): t is string => !!t);

  return NextResponse.json({
    submittedToday: !!todayReport,
    today: todayReport
      ? {
          summary: todayReport.summary,
          blockers: todayReport.blockers,
          tomorrowPlan: todayReport.tomorrowPlan,
          taskIds: parseTaskIds(todayReport.taskIds),
          attachments: parseAttachments(todayReport.attachments),
          important: todayReport.important,
        }
      : null,
    history: history.map((r) => ({
      id: r.id,
      date: r.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      summary: r.summary,
      blockers: r.blockers,
      tomorrowPlan: r.tomorrowPlan,
      tasks: resolve(parseTaskIds(r.taskIds)),
      attachments: parseAttachments(r.attachments),
      important: r.important,
    })),
    compliance: {
      submitted: monthReports.length,
      workingDays: countWeekdays(monthStart, today),
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const summary = body?.summary?.trim();
  if (!summary) return NextResponse.json({ error: "A summary of today's work is required." }, { status: 400 });

  const requestedTaskIds: number[] = Array.isArray(body?.taskIds) ? body.taskIds.map(Number).filter(Number.isFinite) : [];
  const candidateTasks = requestedTaskIds.length
    ? await prisma.task.findMany({ where: { id: { in: requestedTaskIds } }, select: { id: true, assigneeIds: true } })
    : [];
  const ownedTasks = candidateTasks.filter((t) => parseTaskIds(t.assigneeIds).includes(user.id));
  const taskIds = JSON.stringify(ownedTasks.map((t) => t.id));

  const { attachments: safeAttachments, error: attachmentError } = sanitizeAttachments(body?.attachments);
  if (attachmentError) return NextResponse.json({ error: attachmentError }, { status: 400 });
  const attachments = JSON.stringify(safeAttachments);
  const important = !!body?.important;

  const today = startOfDay(new Date());
  const report = await prisma.eODReport.upsert({
    where: { employeeId_date: { employeeId: user.id, date: today } },
    create: { employeeId: user.id, date: today, summary, blockers: body?.blockers || null, tomorrowPlan: body?.tomorrowPlan || null, taskIds, attachments, important },
    update: { summary, blockers: body?.blockers || null, tomorrowPlan: body?.tomorrowPlan || null, taskIds, attachments, important },
  });

  const admins = await prisma.employee.findMany({ where: { role: "super_admin" } });
  const eodEmailSubject = `EOD submitted — ${user.name}`;
  const eodEmailHtml = `<p><strong>${user.name}</strong> has submitted today's EOD report and marked it important.</p><p><strong>Summary:</strong> ${summary}</p>`;

  // The employee marks a report "important" at submit time; only then do we
  // send email alerts. In-app notifications still go out for every submission.
  if (important) {
    const EOD_ALERT_EXTRA_RECIPIENTS = ["adityayadav6661@gmail.com", "ashika221997@gmail.com"];
    await sendMail(EOD_ALERT_EXTRA_RECIPIENTS, eodEmailSubject, eodEmailHtml);
  }
  await Promise.all(
    admins.map((admin) =>
      Promise.all([
        notify(admin.id, "eod", "EOD submitted", `${user.name} has submitted an EOD report.`, "eod"),
        ...(important ? [sendMail(admin.email, eodEmailSubject, eodEmailHtml)] : []),
      ])
    )
  );

  return NextResponse.json({ ok: true, id: report.id });
}

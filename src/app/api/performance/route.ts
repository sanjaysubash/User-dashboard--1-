import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

const BUCKETS = [
  { label: "Outstanding (5.0)", min: 5, max: 5.01, color: "bg-emerald-500" },
  { label: "Exceeds Expectations (4.0–4.9)", min: 4, max: 5, color: "bg-indigo-500" },
  { label: "Meets Expectations (3.0–3.9)", min: 3, max: 4, color: "bg-amber-500" },
  { label: "Needs Improvement (2.0–2.9)", min: 2, max: 3, color: "bg-orange-500" },
  { label: "Unsatisfactory (<2.0)", min: 0, max: 2, color: "bg-red-500" },
];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cycle = await prisma.performanceCycle.findFirst({ orderBy: { id: "desc" } });
  const reviews = cycle
    ? await prisma.performanceReview.findMany({
        where: { cycleId: cycle.id },
        include: { employee: true, reviewer: true },
        orderBy: { id: "asc" },
      })
    : [];

  const total = reviews.length;
  const completed = reviews.filter((r) => r.status === "completed").length;
  const scored = reviews.filter((r) => r.score != null);

  const distribution = BUCKETS.map((b) => ({
    label: b.label,
    color: b.color,
    pct: scored.length ? Math.round((scored.filter((r) => (r.score ?? 0) >= b.min && (r.score ?? 0) < b.max).length / scored.length) * 100) : 0,
  }));

  return NextResponse.json({
    cycle: cycle ? { id: cycle.id, name: cycle.name, quarter: `${cycle.quarter} ${cycle.year}` } : null,
    completion: { completed, total, pct: total ? Math.round((completed / total) * 100) : 0 },
    distribution,
    reviews: reviews.map((r) => ({
      id: r.id,
      name: r.employee.name,
      avatar: r.employee.avatarInitials,
      avatarColor: r.employee.avatarColor,
      reviewer: r.reviewer?.name ?? "Unassigned",
      period: cycle ? `${cycle.quarter} ${cycle.year}` : "",
      score: r.score,
      status: r.status,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  if (!name) return NextResponse.json({ error: "Cycle name is required." }, { status: 400 });

  const departments: string[] = Array.isArray(body?.departments) ? body.departments : [];

  const cycle = await prisma.performanceCycle.create({
    data: {
      name,
      quarter: body?.quarter || "Q1",
      year: body?.year || String(new Date().getFullYear()),
      reviewType: body?.reviewType || "manager",
      ratingScale: body?.ratingScale || "1-5",
      template: body?.template || null,
      departments: JSON.stringify(departments),
      kickoff: body?.kickoff ? new Date(body.kickoff) : null,
      selfDeadline: body?.selfDeadline ? new Date(body.selfDeadline) : null,
      managerDeadline: body?.managerDeadline ? new Date(body.managerDeadline) : null,
      resultsDate: body?.resultsDate ? new Date(body.resultsDate) : null,
    },
  });

  const employees = await prisma.employee.findMany({
    where: departments.length ? { department: { name: { in: departments } } } : {},
    include: { manager: true },
  });

  for (const e of employees) {
    await prisma.performanceReview.create({
      data: { cycleId: cycle.id, employeeId: e.id, reviewerId: e.managerId ?? null, status: "todo" },
    });
    await notify(e.id, "performance", "Performance review started", `"${name}" has begun. Complete your self-assessment by ${body?.selfDeadline || "the deadline"}.`, "performance");
  }

  await logAudit(user, `Started review cycle "${name}" for ${employees.length} employees`, "Performance");

  return NextResponse.json({ cycle: { id: cycle.id, name: cycle.name } }, { status: 201 });
}

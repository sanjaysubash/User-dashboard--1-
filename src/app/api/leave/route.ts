import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canApprove, isHrAdmin, APPROVER_ROLES } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { notify } from "@/lib/notify";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const employeeIdParam = searchParams.get("employeeId");
  const targetId = employeeIdParam ? Number(employeeIdParam) : user.id;
  if (targetId !== user.id && !isHrAdmin(user) && !canApprove(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (scope === "pending" && canApprove(user)) {
    const pending = await prisma.leaveRequest.findMany({
      where: { status: "pending" },
      include: { employee: true, leaveType: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      pending: pending.map((r) => ({
        id: r.id,
        employee: r.employee.name,
        avatar: r.employee.avatarInitials,
        avatarColor: r.employee.avatarColor,
        dates: `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`,
        type: r.leaveType.name,
        days: r.days,
        reason: r.reason,
      })),
    });
  }

  const leaveTypes = await prisma.leaveType.findMany({ orderBy: { id: "asc" } });
  const balances = await prisma.leaveBalance.findMany({ where: { employeeId: targetId }, include: { leaveType: true } });
  const balanceByType = new Map(balances.map((b) => [b.leaveTypeId, b]));

  const balancesOut = leaveTypes.map((lt) => {
    const b = balanceByType.get(lt.id);
    const total = b?.total ?? lt.defaultDays;
    const used = b?.used ?? 0;
    return { type: lt.name, total, used, remaining: total - used, color: lt.color };
  });

  const history = await prisma.leaveRequest.findMany({
    where: { employeeId: targetId },
    include: { leaveType: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    balances: balancesOut,
    history: history.map((r) => ({
      id: r.id,
      dates: r.days <= 1 ? formatDate(r.startDate) : `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`,
      type: r.leaveType.name,
      days: r.days,
      reason: r.reason,
      status: r.status,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const typeName = body?.type?.trim();
  const from = body?.from ? new Date(body.from) : null;
  const to = body?.to ? new Date(body.to) : null;
  const reason = body?.reason?.trim();
  const halfDay = !!body?.halfDay;

  if (!typeName || !from || !to || !reason || isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: "Leave type, dates, and reason are required." }, { status: 400 });
  }

  const leaveType = await prisma.leaveType.findUnique({ where: { name: typeName } });
  if (!leaveType) return NextResponse.json({ error: "Unknown leave type." }, { status: 400 });

  const days = halfDay ? 0.5 : Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);

  const balance = await prisma.leaveBalance.upsert({
    where: { employeeId_leaveTypeId: { employeeId: user.id, leaveTypeId: leaveType.id } },
    create: { employeeId: user.id, leaveTypeId: leaveType.id, total: leaveType.defaultDays, used: 0 },
    update: {},
  });

  if (days > balance.total - balance.used) {
    return NextResponse.json({ error: "Insufficient leave balance for this request." }, { status: 400 });
  }

  const request = await prisma.leaveRequest.create({
    data: { employeeId: user.id, leaveTypeId: leaveType.id, startDate: from, endDate: to, days, reason },
  });

  const approvers = await prisma.employee.findMany({ where: { role: { in: APPROVER_ROLES as any } } });
  await Promise.all(
    approvers.map((approver) =>
      notify(
        approver.id,
        "leave",
        "New leave request",
        `${user.name} applied for ${days} day(s) of ${leaveType.name} (${formatDate(from)} – ${formatDate(to)}).`,
        "leave"
      )
    )
  );

  return NextResponse.json({ request: { id: request.id, status: request.status } }, { status: 201 });
}

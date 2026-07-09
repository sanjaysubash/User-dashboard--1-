import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canSubmitOpsExpense } from "@/lib/auth";
import { formatDate } from "@/lib/format";

const PAYMENT_MODES = ["cash", "online", "cheque"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSuperAdmin = user.role === "super_admin";
  if (!isSuperAdmin && !canSubmitOpsExpense(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entries = await prisma.opsExpense.findMany({
    where: isSuperAdmin ? undefined : { employeeId: user.id },
    include: { employee: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      date: formatDate(e.date),
      rawDate: e.date.toISOString(),
      payeeName: e.payeeName,
      reason: e.reason,
      description: e.description ?? "",
      paymentMode: e.paymentMode,
      amount: e.amount,
      screenshotUrl: e.screenshotUrl,
      submittedBy: e.employee.name,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSubmitOpsExpense(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const payeeName = body?.payeeName?.trim();
  const reason = body?.reason?.trim();
  const description = body?.description?.trim() || null;
  const paymentMode = body?.paymentMode;
  const date = body?.date ? new Date(body.date) : null;
  const amount = Math.round(Number(body?.amount));
  const screenshotUrl = body?.screenshotUrl?.trim() || null;

  if (!payeeName) return NextResponse.json({ error: "A payee name is required." }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "A reason for payment is required." }, { status: 400 });
  if (!PAYMENT_MODES.includes(paymentMode)) {
    return NextResponse.json({ error: "Invalid payment mode." }, { status: 400 });
  }
  if (!date || isNaN(date.getTime())) {
    return NextResponse.json({ error: "A valid date is required." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "A valid amount is required." }, { status: 400 });
  }
  if (paymentMode === "online" && !screenshotUrl) {
    return NextResponse.json({ error: "A payment screenshot is required for online payments." }, { status: 400 });
  }
  if (paymentMode !== "online" && screenshotUrl) {
    return NextResponse.json({ error: "A screenshot is only accepted for online payments." }, { status: 400 });
  }

  const entry = await prisma.opsExpense.create({
    data: { employeeId: user.id, payeeName, reason, description, paymentMode, date, amount, screenshotUrl },
  });

  return NextResponse.json({ entry: { id: entry.id } }, { status: 201 });
}

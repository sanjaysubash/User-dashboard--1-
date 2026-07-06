import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function periodLabel(p: string) {
  const [y, m] = p.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

async function ensureSettings() {
  return prisma.orgSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await ensureSettings();
  const period = currentPeriod();

  const existing = await prisma.invoice.findFirst({ where: { period } });
  if (!existing) {
    await prisma.invoice.create({ data: { period, amount: settings.pricePerMonth, status: "pending" } });
  }

  const invoices = await prisma.invoice.findMany({ orderBy: { issuedAt: "desc" }, take: 6 });
  const activeSeats = await prisma.employee.count({ where: { status: { not: "inactive" } } });

  return NextResponse.json({
    plan: settings.plan,
    seats: settings.seats,
    activeSeats,
    pricePerMonth: settings.pricePerMonth,
    invoices: invoices.map((i) => ({
      id: i.id,
      period: periodLabel(i.period),
      amount: i.amount,
      status: i.status,
      issuedAt: i.issuedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      paidAt: i.paidAt ? i.paidAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = Number(body?.id);
  const status = body?.status;
  if (!id || (status !== "paid" && status !== "pending" && status !== "failed")) {
    return NextResponse.json({ error: "Invalid invoice id or status." }, { status: 400 });
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: { status, paidAt: status === "paid" ? new Date() : null },
  });

  await logAudit(user, `Marked invoice ${invoice.period} as ${status}`, "Billing");

  return NextResponse.json({ ok: true });
}

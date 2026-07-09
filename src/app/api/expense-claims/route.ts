import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { notify } from "@/lib/notify";

const CATEGORIES = ["Travel", "Meals", "Office Supplies", "Software", "Other"];

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");

  if (scope === "pending" && isHrAdmin(user)) {
    const pending = await prisma.expenseClaim.findMany({
      where: { status: "pending" },
      include: { employee: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      pending: pending.map((r) => ({
        id: r.id,
        employee: r.employee.name,
        avatar: r.employee.avatarInitials,
        avatarColor: r.employee.avatarColor,
        date: formatDate(r.date),
        category: r.category,
        amount: r.amount,
        description: r.description,
      })),
    });
  }

  const history = await prisma.expenseClaim.findMany({
    where: { employeeId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    history: history.map((r) => ({
      id: r.id,
      date: formatDate(r.date),
      category: r.category,
      amount: r.amount,
      description: r.description,
      status: r.status,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const category = body?.category;
  const date = body?.date ? new Date(body.date) : null;
  const description = body?.description?.trim();
  const amount = Math.round(Number(body?.amount));

  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (!date || isNaN(date.getTime())) {
    return NextResponse.json({ error: "A valid date is required." }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ error: "A description is required." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "A valid amount is required." }, { status: 400 });
  }

  const claim = await prisma.expenseClaim.create({
    data: { employeeId: user.id, category, date, description, amount },
  });

  const admins = await prisma.employee.findMany({ where: { role: { in: ["super_admin", "hr_admin"] } } });
  await Promise.all(
    admins.map((admin) =>
      notify(
        admin.id,
        "expense",
        "New expense claim",
        `${user.name} submitted a ₹${amount.toLocaleString("en-IN")} ${category} expense claim.`,
        "expense-claims"
      )
    )
  );

  return NextResponse.json({ claim: { id: claim.id, status: claim.status } }, { status: 201 });
}

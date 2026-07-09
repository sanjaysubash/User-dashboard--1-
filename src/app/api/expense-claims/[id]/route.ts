import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number((await params).id);
  const body = await req.json().catch(() => ({}));
  const status = body?.status;
  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json({ error: "status must be 'approved' or 'rejected'." }, { status: 400 });
  }

  const claim = await prisma.expenseClaim.findUnique({ where: { id } });
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (claim.status !== "pending") return NextResponse.json({ error: "Claim already reviewed." }, { status: 409 });

  await prisma.expenseClaim.update({
    where: { id },
    data: { status, reviewedById: user.id, reviewedAt: new Date() },
  });

  await notify(claim.employeeId, "expense", `Expense claim ${status}`, `Your ₹${claim.amount.toLocaleString("en-IN")} ${claim.category} expense claim has been ${status} by ${user.name}.`, "expense-claims");
  await logAudit(user, `${status === "approved" ? "Approved" : "Rejected"} expense claim #${claim.id}`, "Expense Claims");

  return NextResponse.json({ ok: true });
}

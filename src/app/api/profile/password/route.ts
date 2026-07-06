import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentSessionTokenHash } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const currentPassword = body?.currentPassword;
  const newPassword = body?.newPassword;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({ where: { id: user.id } });
  if (!employee || !verifyPassword(currentPassword, employee.passwordHash)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  await prisma.employee.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPassword) } });

  const currentHash = await getCurrentSessionTokenHash();
  await prisma.session.deleteMany({ where: { employeeId: user.id, ...(currentHash ? { tokenHash: { not: currentHash } } : {}) } });

  await logAudit(user, "Changed own password", "Profile", "warning");

  return NextResponse.json({ ok: true });
}

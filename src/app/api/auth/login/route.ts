import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, setSessionCookie } from "@/lib/auth";
import { toAuthUser, getPermissionsForRole } from "@/lib/roles";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
    where: { email },
    include: { department: true },
  });

  const userAgent = req.headers.get("user-agent");
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";

  if (!employee || !verifyPassword(password, employee.passwordHash)) {
    await logAudit(null, `Failed login attempt for ${email}`, "Auth", "danger", ip);
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(employee.id, userAgent, ip);
  const permissions = await getPermissionsForRole(employee.role);
  // The mobile app and desktop agent can't use httpOnly cookies; they get the
  // raw token in the body and send it back as an Authorization: Bearer
  // header (see lib/auth).
  const wantsToken = ["mobile", "desktop"].includes(req.headers.get("x-client") ?? "");
  const res = NextResponse.json({
    user: toAuthUser(employee, permissions),
    ...(wantsToken ? { token } : {}),
  });
  setSessionCookie(res, token, expiresAt);
  await logAudit(employee, "Logged in", "Auth", "info", ip);
  return res;
}

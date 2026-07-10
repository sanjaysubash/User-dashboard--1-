import { randomBytes, createHash } from "crypto";
import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";
import type { Employee } from "@prisma/client";
import { prisma } from "./prisma";

export { hashPassword, verifyPassword } from "./password";

export const SESSION_COOKIE = "riaura_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SafeEmployee = Omit<Employee, "passwordHash"> & {
  department?: { name: string } | null;
};

function sanitize(employee: Employee & { department?: { name: string } | null }): SafeEmployee {
  const { passwordHash: _passwordHash, ...safe } = employee;
  return safe;
}

export async function createSession(employeeId: number, userAgent?: string | null, ip?: string | null) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { id: randomBytes(16).toString("hex"), tokenHash, employeeId, expiresAt, userAgent: userAgent ?? null, ip: ip ?? null },
  });
  return { token, expiresAt };
}

// The web app authenticates via the httpOnly session cookie; the mobile app
// sends the same raw token as an Authorization: Bearer header instead.
async function getRawSessionToken(): Promise<string | null> {
  const store = await cookies();
  const cookieToken = store.get(SESSION_COOKIE)?.value;
  if (cookieToken) return cookieToken;
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice("Bearer ".length).trim() || null;
  return null;
}

export async function getCurrentSessionTokenHash(): Promise<string | null> {
  const token = await getRawSessionToken();
  return token ? hashToken(token) : null;
}

export function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function destroyCurrentSession() {
  const token = await getRawSessionToken();
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
}

export async function getCurrentUser(): Promise<SafeEmployee | null> {
  const token = await getRawSessionToken();
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { employee: { include: { department: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return sanitize(session.employee);
}

const HR_ROLES = ["super_admin", "hr_admin"];
export function isHrAdmin(user: SafeEmployee): boolean {
  return HR_ROLES.includes(user.role);
}

export function isSuperAdmin(user: SafeEmployee): boolean {
  return user.role === "super_admin";
}

// Leave approval is restricted to super_admin (currently Aashika N and Venkat B,
// the CEO and Co-Founder) rather than the broader manager hierarchy.
export const APPROVER_ROLES = ["super_admin"];
export function canApprove(user: SafeEmployee): boolean {
  return APPROVER_ROLES.includes(user.role);
}

// Tasks are private to the assignee/assigner by default; the manager hierarchy
// (plus super_admin) can see and manage everyone's tasks.
export const TASK_ADMIN_ROLES = ["super_admin", "manager", "first_level_manager", "second_level_manager", "team_lead"];
export function canViewAllTasks(user: SafeEmployee): boolean {
  return TASK_ADMIN_ROLES.includes(user.role);
}

// The ops expense log is scoped to one named individual (an operations
// employee), not a role, so it deliberately sits outside the
// ALL_PERMISSIONS/RolePermission system used everywhere else.
const OPS_EXPENSE_SUBMITTER_EMAILS = ["vignesh@aaruchudar.com"];
export function canSubmitOpsExpense(user: SafeEmployee): boolean {
  return OPS_EXPENSE_SUBMITTER_EMAILS.includes(user.email);
}

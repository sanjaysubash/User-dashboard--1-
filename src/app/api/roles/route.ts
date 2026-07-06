import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ALL_ROLES, ALL_PERMISSIONS, ROLE_LABELS, getPermissionsForRole } from "@/lib/roles";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [userCounts, permissionsByRole] = await Promise.all([
    prisma.employee.groupBy({ by: ["role"], _count: { _all: true } }),
    Promise.all(ALL_ROLES.map(async (role) => [role, await getPermissionsForRole(role)] as const)),
  ]);
  const countByRole = Object.fromEntries(userCounts.map((r) => [r.role, r._count._all]));
  const permsByRole = Object.fromEntries(permissionsByRole);

  return NextResponse.json({
    pages: ALL_PERMISSIONS,
    roles: ALL_ROLES.map((role) => ({
      role,
      label: ROLE_LABELS[role],
      users: countByRole[role] ?? 0,
      permissions: permsByRole[role],
      isWildcard: permsByRole[role].includes("*"),
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const role = body?.role;
  const permission = body?.permission;
  const enabled = !!body?.enabled;
  if (!ALL_ROLES.includes(role) || !ALL_PERMISSIONS.includes(permission)) {
    return NextResponse.json({ error: "Invalid role or permission." }, { status: 400 });
  }
  if (role === "super_admin") {
    return NextResponse.json({ error: "Super Admin always has full access." }, { status: 400 });
  }

  if (enabled) {
    await prisma.rolePermission.upsert({
      where: { role_permission: { role, permission } },
      create: { role, permission },
      update: {},
    });
  } else {
    await prisma.rolePermission.deleteMany({ where: { role, permission } });
  }

  await logAudit(user, `${enabled ? "Granted" : "Revoked"} "${permission}" permission for ${ROLE_LABELS[role]}`, "Roles", "warning");

  return NextResponse.json({ ok: true });
}

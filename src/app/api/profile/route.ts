import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toAuthUser, getPermissionsForRole } from "@/lib/roles";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const firstName = body?.firstName?.trim();
  const lastName = body?.lastName?.trim() ?? "";
  const name = firstName ? `${firstName} ${lastName}`.trim() : undefined;

  const employee = await prisma.employee.update({
    where: { id: user.id },
    data: {
      ...(name ? { name } : {}),
      ...(body.phone ? { phone: body.phone } : {}),
    },
    include: { department: true },
  });

  await logAudit(user, "Updated own profile", "Profile");

  const permissions = await getPermissionsForRole(employee.role);
  return NextResponse.json({ user: toAuthUser(employee, permissions) });
}

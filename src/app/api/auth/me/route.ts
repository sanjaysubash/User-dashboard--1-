import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { toAuthUser, getPermissionsForRole } from "@/lib/roles";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  const permissions = await getPermissionsForRole(user.role);
  return NextResponse.json({ user: toAuthUser(user, permissions) });
}

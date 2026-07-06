import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentSessionTokenHash } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = (await params).id;
  const currentHash = await getCurrentSessionTokenHash();
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session || session.employeeId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.tokenHash === currentHash) return NextResponse.json({ error: "Cannot revoke your current session here — use sign out instead." }, { status: 400 });

  await prisma.session.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

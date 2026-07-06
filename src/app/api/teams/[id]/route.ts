import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number((await params).id);
  const body = await req.json().catch(() => ({}));

  if (Array.isArray(body.memberIds)) {
    await prisma.teamMember.deleteMany({ where: { teamId: id } });
    await prisma.teamMember.createMany({
      data: body.memberIds.map((employeeId: number) => ({ teamId: id, employeeId })),
    });
  }

  const team = await prisma.team.update({
    where: { id },
    data: { ...(body.name ? { name: body.name } : {}) },
  });

  return NextResponse.json({ team: { id: team.id, name: team.name } });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number((await params).id);
  await prisma.teamMember.deleteMany({ where: { teamId: id } });
  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

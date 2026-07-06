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
  const head = body.head ? await prisma.employee.findFirst({ where: { name: body.head } }) : undefined;

  const department = await prisma.department.update({
    where: { id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.color ? { color: body.color } : {}),
      ...(body.budget ? { budget: Math.round(Number(body.budget)) } : {}),
      ...(head ? { headId: head.id } : {}),
    },
  });

  return NextResponse.json({ department: { id: department.id, name: department.name } });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number((await params).id);
  await prisma.department.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

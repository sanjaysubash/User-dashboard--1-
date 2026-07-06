import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number((await params).id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (body.name) data.name = body.name;
  if (body.color) data.color = body.color;
  if ("budget" in body) data.budget = body.budget ? Math.round(Number(body.budget)) : null;
  if ("head" in body) {
    const head = body.head ? await prisma.employee.findFirst({ where: { name: body.head } }) : null;
    data.headId = head?.id ?? null;
  }

  try {
    const department = await prisma.department.update({ where: { id }, data });
    return NextResponse.json({ department: { id: department.id, name: department.name } });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "That employee already heads another department." }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number((await params).id);
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) return NextResponse.json({ error: "Department not found." }, { status: 404 });

  try {
    await prisma.department.delete({ where: { id } });
  } catch (e: any) {
    if (e?.code === "P2003") {
      return NextResponse.json({ error: "This department still has teams assigned to it. Reassign or delete those teams first." }, { status: 409 });
    }
    throw e;
  }

  await logAudit(user, `Deleted department "${department.name}"`, "Departments");

  return NextResponse.json({ ok: true });
}

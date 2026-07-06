import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Node = {
  id: number;
  name: string;
  title: string;
  dept: string;
  avatar: string;
  avatarColor: string;
  managerId: number | null;
  reports: Node[];
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employees = await prisma.employee.findMany({
    where: { status: { not: "inactive" } },
    include: { department: true },
    orderBy: { name: "asc" },
  });

  const byId = new Map<number, Node>();
  for (const e of employees) {
    byId.set(e.id, {
      id: e.id,
      name: e.name,
      title: e.title,
      dept: e.department?.name ?? "",
      avatar: e.avatarInitials,
      avatarColor: e.avatarColor,
      managerId: e.managerId,
      reports: [],
    });
  }

  const roots: Node[] = [];
  for (const node of byId.values()) {
    if (node.managerId && byId.has(node.managerId)) {
      byId.get(node.managerId)!.reports.push(node);
    } else {
      roots.push(node);
    }
  }

  return NextResponse.json({ roots });
}

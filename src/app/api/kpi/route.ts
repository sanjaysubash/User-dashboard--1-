import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const kpis = await prisma.kPI.findMany({ include: { department: true }, orderBy: { id: "asc" } });

  return NextResponse.json({
    kpis: kpis.map((k) => ({
      name: k.name,
      dept: k.department?.name ?? "",
      current: k.current,
      target: k.target,
      unit: k.unit,
      pct: k.target ? Math.round(Math.min(100, (k.current / k.target) * 100)) : 0,
      trend: k.trend,
    })),
  });
}

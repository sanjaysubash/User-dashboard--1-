import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

function currentQuarter() {
  const m = new Date().getMonth();
  return `Q${Math.floor(m / 3) + 1}`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const objectives = await prisma.objective.findMany({
    include: { owner: true, keyResults: true },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    quarter: currentQuarter(),
    objectives: objectives.map((o) => ({
      id: o.id,
      title: o.title,
      owner: o.owner?.name ?? "Unassigned",
      quarter: `${o.quarter} ${o.year}`,
      progress: o.keyResults.length ? Math.round(o.keyResults.reduce((a, k) => a + k.progress, 0) / o.keyResults.length) : 0,
      krs: o.keyResults.map((k) => ({ title: k.title, progress: k.progress, status: k.status })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = body?.title?.trim();
  if (!title) return NextResponse.json({ error: "Objective title is required." }, { status: 400 });

  const owner = body?.owner ? await prisma.employee.findFirst({ where: { name: body.owner } }) : null;
  const krTitles: string[] = Array.isArray(body?.keyResults) ? body.keyResults.filter((t: string) => t?.trim()) : [];

  const objective = await prisma.objective.create({
    data: {
      title,
      ownerId: owner?.id ?? null,
      quarter: body?.quarter || currentQuarter(),
      year: body?.year || String(new Date().getFullYear()),
      keyResults: { create: krTitles.map((t) => ({ title: t, progress: 0, status: "on-track" })) },
    },
  });

  await logAudit(user, `Created objective "${title}"`, "OKR");

  return NextResponse.json({ objective: { id: objective.id, title: objective.title } }, { status: 201 });
}

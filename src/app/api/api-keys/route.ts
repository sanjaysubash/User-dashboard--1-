import { randomBytes, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      key: k.keyPrefix,
      permissions: k.permissions,
      created: k.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      lastUsed: k.lastUsedAt ? k.lastUsedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Never",
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = body?.name?.trim() || "New API Key";
  const permissions = body?.permissions || "Read Only";

  const rawKey = randomBytes(24).toString("hex");
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = `riaura_sk_${rawKey.slice(0, 6)}••••••${rawKey.slice(-4)}`;

  const key = await prisma.apiKey.create({
    data: { name, keyPrefix, keyHash, permissions, createdById: user.id },
  });

  await logAudit(user, `Generated API key "${name}"`, "Settings", "warning");

  // The raw key is only ever shown once, at creation time.
  return NextResponse.json({ key: { id: key.id, name: key.name, rawKey, keyPrefix: key.keyPrefix } }, { status: 201 });
}

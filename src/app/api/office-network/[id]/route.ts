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
  if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim();
  if (typeof body.bssid === "string" && body.bssid.trim()) data.bssid = body.bssid.trim().toLowerCase();
  if ("ssid" in body) data.ssid = typeof body.ssid === "string" && body.ssid.trim() ? body.ssid.trim() : null;
  if ("active" in body) data.active = !!body.active;

  try {
    const network = await prisma.officeNetwork.update({ where: { id }, data });
    await logAudit(user, `Updated office WiFi network "${network.label}"`, "Settings");
    return NextResponse.json({ network });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "That BSSID is already registered." }, { status: 409 });
    }
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Office network not found." }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number((await params).id);
  const network = await prisma.officeNetwork.findUnique({ where: { id } });
  if (!network) return NextResponse.json({ error: "Office network not found." }, { status: 404 });

  await prisma.officeNetwork.delete({ where: { id } });
  await logAudit(user, `Deleted office WiFi network "${network.label}"`, "Settings");

  return NextResponse.json({ ok: true });
}

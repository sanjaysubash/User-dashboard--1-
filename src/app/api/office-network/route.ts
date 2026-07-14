import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

function normalizeBssid(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Any authenticated employee can read this — the desktop agent runs under
  // a regular employee session, not an admin one, and BSSIDs aren't
  // sensitive (everyone on-site already knows the office WiFi).
  const networks = await prisma.officeNetwork.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({
    networks: networks.map((n) => ({
      id: n.id,
      label: n.label,
      bssid: n.bssid,
      ssid: n.ssid,
      active: n.active,
      createdAt: n.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const bssid = typeof body?.bssid === "string" ? normalizeBssid(body.bssid) : "";
  const ssid = typeof body?.ssid === "string" && body.ssid.trim() ? body.ssid.trim() : null;

  if (!label || !bssid) {
    return NextResponse.json({ error: "label and bssid are required." }, { status: 400 });
  }

  try {
    const network = await prisma.officeNetwork.create({
      data: { label, bssid, ssid, createdById: user.id },
    });
    await logAudit(user, `Registered office WiFi network "${label}" (${bssid})`, "Settings");
    return NextResponse.json({ network }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "That BSSID is already registered." }, { status: 409 });
    }
    throw e;
  }
}

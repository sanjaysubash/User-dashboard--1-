import { NextResponse } from "next/server";
import { destroyCurrentSession, clearSessionCookie } from "@/lib/auth";

export async function POST() {
  await destroyCurrentSession();
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

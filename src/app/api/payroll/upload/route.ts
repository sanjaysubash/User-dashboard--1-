import { NextResponse } from "next/server";
import { getCurrentUser, isHrAdmin } from "@/lib/auth";
import { getCloudinaryConfig, signCloudinaryUpload } from "@/lib/cloudinary";

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHrAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const employeeId = Number(body.employeeId);
  if (!employeeId) return NextResponse.json({ error: "employeeId is required." }, { status: 400 });

  try {
    const { cloudName, apiKey } = getCloudinaryConfig();
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `payroll/${employeeId}`;
    const signature = signCloudinaryUpload({ folder, timestamp });
    return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

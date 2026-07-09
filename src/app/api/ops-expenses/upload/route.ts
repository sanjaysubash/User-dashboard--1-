import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser, canSubmitOpsExpense } from "@/lib/auth";

// Same pattern as src/app/api/eod/upload/route.ts: the file goes straight to
// Blob storage from the browser, and the OpsExpense row only ever stores the
// returned URL — the DB never sees the file's bytes.
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await getCurrentUser();
        if (!user || !canSubmitOpsExpense(user)) throw new Error("Unauthorized");

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
          tokenPayload: String(user.id),
        };
      },
      onUploadCompleted: async () => {
        // No DB write here — the client attaches the returned blob URL to
        // the expense entry itself when it calls POST /api/ops-expenses.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

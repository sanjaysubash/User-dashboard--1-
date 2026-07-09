import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Files never touch the database — they go straight to Blob storage from the
// browser, and the EOD record only ever stores the returned URL + metadata
// (see prisma/schema.prisma EODReport.attachments). This is what keeps
// uploads from bloating the Turso/SQLite DB: the DB size grows by ~200 bytes
// of JSON per attachment, not by the file's actual size.
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB per file
const MAX_FILES_PER_REPORT = 5;

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await getCurrentUser();
        if (!user) throw new Error("Unauthorized");

        // Cheap guard against a report accumulating unbounded attachments
        // over repeated edits — enforced again on submit in /api/eod.
        const existingCount = Number(clientPayload) || 0;
        if (existingCount >= MAX_FILES_PER_REPORT) {
          throw new Error(`You can attach at most ${MAX_FILES_PER_REPORT} files to a single EOD report.`);
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
          tokenPayload: String(user.id),
        };
      },
      onUploadCompleted: async () => {
        // No DB write here — the client attaches the returned blob URL to
        // the EOD submission body itself when it calls POST /api/eod.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

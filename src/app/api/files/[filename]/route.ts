import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { getUserId } from "@/lib/session";
import { uploadPath, userOwnsUpload } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};

export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Being logged in isn't enough — the file must be one this user uploaded.
  // Signup closes after the first account, so today there is only ever one
  // user; this keeps the guarantee true regardless.
  if (!(await userOwnsUpload(filename, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let filePath: string;
  try {
    filePath = uploadPath(filename);
    await stat(filePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = filename.split(".").pop() ?? "";
  const buffer = await readFile(filePath);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=86400",
    },
  });
}

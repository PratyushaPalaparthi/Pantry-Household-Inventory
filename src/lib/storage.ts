import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export async function saveUpload(file: File, userId: string): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
  return saveBuffer(Buffer.from(await file.arrayBuffer()), file.type, userId);
}

export async function saveBuffer(buffer: Buffer, mimeType: string, userId: string): Promise<string> {
  const ext = ALLOWED_TYPES[mimeType];
  if (!ext) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  await prisma.upload.create({ data: { filename, userId } });

  return filename;
}

// True when this user saved the file. Ownership lives in the Upload table so it
// holds even before the file is attached to an Item or Receipt.
export async function userOwnsUpload(filename: string, userId: string): Promise<boolean> {
  const row = await prisma.upload.findFirst({ where: { filename, userId }, select: { filename: true } });
  return row !== null;
}

export function uploadPath(filename: string): string {
  // Guard against path traversal — only a bare filename we generated ourselves is valid.
  if (filename.includes("/") || filename.includes("..")) {
    throw new Error("Invalid filename");
  }
  return path.join(UPLOAD_DIR, filename);
}

export function fileUrl(filename: string): string {
  return `/api/files/${filename}`;
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { saveUpload, fileUrl, uploadPath } from "@/lib/storage";
import { extractText } from "@/lib/ocr";
import { parseReceiptText } from "@/lib/ai/receipt-parser";
import { findBestMatch } from "@/lib/fuzzy-match";
import { readFile } from "fs/promises";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const receipts = await prisma.receipt.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
    include: { lines: true },
  });
  return NextResponse.json(receipts);
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "A receipt photo is required" }, { status: 400 });
  }

  const filename = await saveUpload(photo, userId);
  const imageUrl = fileUrl(filename);

  const receipt = await prisma.receipt.create({
    data: { userId, imageUrl, parsedStatus: "processing" },
  });

  let ocrText = "";
  try {
    const buffer = await readFile(uploadPath(filename));
    ocrText = await extractText(buffer);
    const parsed = await parseReceiptText(ocrText);

    const userItems = await prisma.item.findMany({ where: { userId } });

    await Promise.all(
      parsed.lines.map(async (line) => {
        const match = findBestMatch(line.name, userItems, (i) => i.name, 0.45);
        return prisma.receiptLine.create({
          data: {
            receiptId: receipt.id,
            rawText: line.rawText,
            parsedName: line.name,
            quantity: line.quantity,
            unitOfMeasure: line.unitOfMeasure,
            price: line.price,
            matchedItemId: match?.item.id ?? null,
            status: match ? "matched" : "unresolved",
          },
        });
      })
    );

    const updated = await prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        parsedStatus: "needs_review",
        rawOcrText: ocrText,
        storeName: parsed.storeName,
      },
      include: { lines: true },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    await prisma.receipt.update({
      where: { id: receipt.id },
      data: { parsedStatus: "failed", rawOcrText: ocrText || null },
    });
    const message = err instanceof Error ? err.message : "Failed to parse receipt";
    return NextResponse.json({ error: message, receiptId: receipt.id }, { status: 502 });
  }
}

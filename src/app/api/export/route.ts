import { NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { toCsv } from "@/lib/csv";
import { totalQuantity } from "@/lib/inventory";

async function gatherData(userId: string) {
  const items = await prisma.item.findMany({
    where: { userId },
    include: { locations: true, tags: { include: { tag: true } } },
    orderBy: { name: "asc" },
  });

  const priceHistory = await prisma.priceHistory.findMany({
    where: { item: { userId } },
    include: { store: true, item: { select: { name: true } } },
    orderBy: { date: "asc" },
  });

  const shoppingList = await prisma.shoppingListEntry.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });

  const receipts = await prisma.receipt.findMany({
    where: { userId },
    include: { lines: true },
    orderBy: { uploadedAt: "asc" },
  });

  return { items, priceHistory, shoppingList, receipts };
}

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const { items, priceHistory, shoppingList, receipts } = await gatherData(userId);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const payload = {
      exportedAt: new Date().toISOString(),
      items: items.map((item) => ({
        ...item,
        totalQuantity: totalQuantity(item.locations),
        tags: item.tags.map((t) => t.tag.name),
      })),
      priceHistory,
      shoppingList,
      receipts,
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="pantry-export-${stamp}.json"`,
      },
    });
  }

  const zip = new JSZip();

  zip.file(
    "items.csv",
    toCsv(
      items.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        unitOfMeasure: i.unitOfMeasure,
        totalQuantity: totalQuantity(i.locations),
        lowStockThreshold: i.lowStockThreshold,
        brand: i.brand ?? "",
        preferredStore: i.preferredStore ?? "",
        expirationDate: i.expirationDate?.toISOString() ?? "",
        barcode: i.barcode ?? "",
        tags: i.tags.map((t) => t.tag.name).join(";"),
        notes: i.notes ?? "",
        createdAt: i.createdAt.toISOString(),
      }))
    )
  );

  zip.file(
    "item_locations.csv",
    toCsv(
      items.flatMap((i) =>
        i.locations.map((l) => ({ itemId: i.id, itemName: i.name, locationName: l.locationName, quantity: l.quantity }))
      )
    )
  );

  zip.file(
    "price_history.csv",
    toCsv(
      priceHistory.map((p) => ({
        itemName: p.item.name,
        store: p.store.name,
        price: p.price,
        quantityPurchased: p.quantityPurchased,
        unitOfMeasure: p.unitOfMeasure,
        date: p.date.toISOString(),
      }))
    )
  );

  zip.file(
    "shopping_list.csv",
    toCsv(
      shoppingList.map((s) => ({
        text: s.text,
        unitOfMeasure: s.unitOfMeasure ?? "",
        isManual: s.isManual,
        isDone: s.isDone,
        createdAt: s.createdAt.toISOString(),
      }))
    )
  );

  zip.file(
    "receipts.csv",
    toCsv(
      receipts.map((r) => ({
        id: r.id,
        storeName: r.storeName ?? "",
        uploadedAt: r.uploadedAt.toISOString(),
        parsedStatus: r.parsedStatus,
        lineCount: r.lines.length,
      }))
    )
  );

  zip.file(
    "receipt_lines.csv",
    toCsv(
      receipts.flatMap((r) =>
        r.lines.map((l) => ({
          receiptId: r.id,
          rawText: l.rawText,
          parsedName: l.parsedName ?? "",
          quantity: l.quantity ?? "",
          unitOfMeasure: l.unitOfMeasure ?? "",
          price: l.price ?? "",
          status: l.status,
        }))
      )
    )
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="pantry-export-${stamp}.zip"`,
    },
  });
}

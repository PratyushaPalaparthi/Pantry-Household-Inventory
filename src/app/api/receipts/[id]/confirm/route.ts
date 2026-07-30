import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { restockItem } from "@/lib/restock";

const decisionSchema = z.discriminatedUnion("action", [
  z.object({
    lineId: z.string(),
    action: z.literal("match"),
    itemId: z.string(),
    quantity: z.coerce.number().positive(),
    price: z.coerce.number().min(0).optional(),
    // Restocking a perishable resets when it goes off, so allow the receipt to
    // update the existing item's expiry.
    expirationDate: z.string().optional(),
  }),
  z.object({
    lineId: z.string(),
    action: z.literal("create"),
    name: z.string().min(1),
    category: z.string().min(1),
    unitOfMeasure: z.string().min(1),
    locationName: z.string().min(1).default("Pantry"),
    quantity: z.coerce.number().positive(),
    price: z.coerce.number().min(0).optional(),
    brand: z.string().optional(),
    expirationDate: z.string().optional(),
  }),
  z.object({
    lineId: z.string(),
    action: z.literal("ignore"),
  }),
]);

const confirmSchema = z.object({
  storeName: z.string().optional(),
  decisions: decisionSchema.array(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const receipt = await prisma.receipt.findUnique({ where: { id }, include: { lines: true } });
  if (!receipt || receipt.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { storeName, decisions } = parsed.data;

  const lineIds = new Set(receipt.lines.map((l) => l.id));

  for (const decision of decisions) {
    if (!lineIds.has(decision.lineId)) continue;

    if (decision.action === "ignore") {
      await prisma.receiptLine.update({ where: { id: decision.lineId }, data: { status: "ignored" } });
      continue;
    }

    if (decision.action === "match") {
      const item = await prisma.item.findUnique({ where: { id: decision.itemId } });
      if (!item || item.userId !== userId) continue;

      if (decision.expirationDate) {
        await prisma.item.update({
          where: { id: item.id },
          data: { expirationDate: new Date(decision.expirationDate) },
        });
      }

      await restockItem(item.id, { quantity: decision.quantity, price: decision.price, storeName });
      await prisma.receiptLine.update({
        where: { id: decision.lineId },
        data: { status: "confirmed", matchedItemId: item.id },
      });
      continue;
    }

    // action === "create"
    const newItem = await prisma.item.create({
      data: {
        userId,
        name: decision.name,
        category: decision.category,
        unitOfMeasure: decision.unitOfMeasure,
        lowStockThreshold: 0,
        preferredStore: storeName || null,
        brand: decision.brand || null,
        expirationDate: decision.expirationDate ? new Date(decision.expirationDate) : null,
        locations: { create: [{ locationName: decision.locationName, quantity: 0 }] },
      },
    });
    await restockItem(newItem.id, { quantity: decision.quantity, price: decision.price, storeName });
    await prisma.receiptLine.update({
      where: { id: decision.lineId },
      data: { status: "confirmed", matchedItemId: newItem.id },
    });
  }

  const updated = await prisma.receipt.update({
    where: { id: receipt.id },
    data: { parsedStatus: "confirmed" },
    include: { lines: true },
  });

  return NextResponse.json(updated);
}

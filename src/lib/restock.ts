import { prisma } from "@/lib/prisma";
import { findOrCreateStore } from "@/lib/store";

export async function restockItem(
  itemId: string,
  { quantity, price, storeName, locationName }: { quantity: number; price?: number; storeName?: string; locationName?: string }
) {
  const item = await prisma.item.findUniqueOrThrow({ where: { id: itemId }, include: { locations: true } });

  const targetLocation =
    (locationName && item.locations.find((l) => l.locationName.toLowerCase() === locationName.toLowerCase())) ||
    item.locations[0];

  if (targetLocation) {
    await prisma.itemLocation.update({
      where: { id: targetLocation.id },
      data: { quantity: { increment: quantity } },
    });
  } else {
    await prisma.itemLocation.create({
      data: { itemId: item.id, locationName: locationName || "Unspecified", quantity },
    });
  }

  if (price !== undefined && price > 0) {
    const store = await findOrCreateStore(storeName || item.preferredStore || "Unknown store");
    await prisma.priceHistory.create({
      data: {
        itemId: item.id,
        storeId: store.id,
        price,
        quantityPurchased: quantity,
        unitOfMeasure: item.unitOfMeasure,
      },
    });
  }

  await prisma.usageEvent.create({
    data: { itemId: item.id, delta: quantity, reason: "restock" },
  });
}

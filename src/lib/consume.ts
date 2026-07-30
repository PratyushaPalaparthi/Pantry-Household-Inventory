import { prisma } from "@/lib/prisma";
import { totalQuantity } from "@/lib/inventory";

/**
 * Reduces an item's stock, spreading the reduction across locations
 * (largest first) until the requested amount is consumed or stock runs out.
 * Pass `"all"` to zero the item out entirely.
 */
export async function consumeItem(itemId: string, amount: number | "all") {
  const item = await prisma.item.findUniqueOrThrow({ where: { id: itemId }, include: { locations: true } });

  const before = totalQuantity(item.locations);
  let remaining = amount === "all" ? before : Math.min(amount, before);
  const consumed = remaining;

  const sorted = [...item.locations].sort((a, b) => b.quantity - a.quantity);
  for (const loc of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(loc.quantity, remaining);
    if (take > 0) {
      await prisma.itemLocation.update({ where: { id: loc.id }, data: { quantity: { decrement: take } } });
      remaining -= take;
    }
  }

  if (consumed > 0) {
    await prisma.usageEvent.create({
      data: { itemId: item.id, delta: -consumed, reason: "consume" },
    });
  }

  return { consumed, remaining: before - consumed };
}

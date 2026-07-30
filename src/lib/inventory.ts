import type { Item, ItemLocation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { daysUntil } from "@/lib/dates";

/**
 * The categories and storage locations this user actually uses, so dropdowns can
 * lead with their own vocabulary rather than a generic list.
 */
export async function getUserVocabulary(userId: string): Promise<{ categories: string[]; locations: string[] }> {
  const [items, locations] = await Promise.all([
    prisma.item.findMany({ where: { userId }, select: { category: true }, distinct: ["category"] }),
    prisma.itemLocation.findMany({
      where: { item: { userId } },
      select: { locationName: true },
      distinct: ["locationName"],
    }),
  ]);

  const collate = (values: string[]) => values.filter(Boolean).sort((a, b) => a.localeCompare(b));

  return {
    categories: collate(items.map((item) => item.category)),
    locations: collate(locations.map((location) => location.locationName)),
  };
}

export function totalQuantity(locations: Pick<ItemLocation, "quantity">[]): number {
  return locations.reduce((sum, loc) => sum + loc.quantity, 0);
}

export function isLowStock(item: Pick<Item, "lowStockThreshold">, locations: Pick<ItemLocation, "quantity">[]): boolean {
  return totalQuantity(locations) <= item.lowStockThreshold;
}

// Compared at whole-day granularity in UTC — see src/lib/dates.ts for why.
// An item expiring *today* counts as expiring soon but not yet expired.
export function isExpiringSoon(expirationDate: Date | null, withinDays = 7): boolean {
  if (!expirationDate) return false;
  return daysUntil(expirationDate) <= withinDays;
}

export function isExpired(expirationDate: Date | null): boolean {
  if (!expirationDate) return false;
  return daysUntil(expirationDate) < 0;
}

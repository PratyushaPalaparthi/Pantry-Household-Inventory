import { prisma } from "@/lib/prisma";
import { findBestMatch } from "@/lib/fuzzy-match";

/**
 * Resolves a free-text store name to a Store row, fuzzy-matching against
 * existing stores first (so "Safeway" and "Safeway Inc" collapse to one row)
 * before creating a new one.
 */
export async function findOrCreateStore(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Store name is required");

  const existing = await prisma.store.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing;

  const allStores = await prisma.store.findMany();
  const match = findBestMatch(trimmed, allStores, (s) => s.name, 0.6);
  if (match) return match.item;

  return prisma.store.create({ data: { name: trimmed } });
}

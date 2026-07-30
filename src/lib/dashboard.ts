import { prisma } from "@/lib/prisma";
import { isLowStock, isExpiringSoon } from "@/lib/inventory";
import { findBestMatch } from "@/lib/fuzzy-match";

export async function getDashboardData(userId: string) {
  const items = await prisma.item.findMany({
    where: { userId },
    include: { locations: true },
  });

  const lowStockItems = items.filter((item) => isLowStock(item, item.locations));
  const expiringItems = items.filter((item) => isExpiringSoon(item.expirationDate));

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const priceHistory = await prisma.priceHistory.findMany({
    where: { item: { userId }, date: { gte: sixMonthsAgo } },
    include: { item: { select: { category: true } } },
    orderBy: { date: "asc" },
  });

  const monthlySpend = priceHistory
    .filter((p) => p.date >= monthStart)
    .reduce((sum, p) => sum + p.price, 0);

  // Spending by category, bucketed by month, top 5 categories + "Other"
  const categoryTotals = new Map<string, number>();
  for (const p of priceHistory) {
    categoryTotals.set(p.item.category, (categoryTotals.get(p.item.category) ?? 0) + p.price);
  }
  const topCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const monthBuckets = new Map<string, Record<string, number>>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const key = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    monthBuckets.set(key, {});
  }
  for (const p of priceHistory) {
    const key = p.date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    const bucket = monthBuckets.get(key);
    if (!bucket) continue;
    const cat = topCategories.includes(p.item.category) ? p.item.category : "Other";
    bucket[cat] = (bucket[cat] ?? 0) + p.price;
  }
  const spendByCategory = Array.from(monthBuckets.entries()).map(([month, cats]) => ({ month, ...cats }));

  // Most active items (restocked or consumed most) in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const usageEvents = await prisma.usageEvent.findMany({
    where: { item: { userId }, createdAt: { gte: thirtyDaysAgo } },
    include: { item: { select: { id: true, name: true } } },
  });
  const activityCount = new Map<string, { name: string; count: number }>();
  for (const e of usageEvents) {
    const entry = activityCount.get(e.itemId) ?? { name: e.item.name, count: 0 };
    entry.count += 1;
    activityCount.set(e.itemId, entry);
  }
  const mostActiveItems = Array.from(activityCount.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Duplicate detection: items whose names are suspiciously similar
  const duplicateGroups: { a: string; b: string; score: number }[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const others = items.filter((i) => i.id !== item.id && !seen.has(`${item.id}:${i.id}`) && !seen.has(`${i.id}:${item.id}`));
    const match = findBestMatch(item.name, others, (i) => i.name, 0.5);
    if (match) {
      duplicateGroups.push({ a: item.name, b: match.item.name, score: match.score });
      seen.add(`${item.id}:${match.item.id}`);
    }
  }

  return {
    totalItems: items.length,
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.slice(0, 5),
    expiringItems: expiringItems.slice(0, 5),
    monthlySpend,
    spendByCategory,
    topCategories,
    mostActiveItems,
    duplicateGroups,
  };
}

import Link from "next/link";
import { Plus, ScanLine } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { ItemCard } from "@/components/ItemCard";
import { totalQuantity, isLowStock, isExpiringSoon, getUserVocabulary } from "@/lib/inventory";
import { InventoryFilters } from "@/components/InventoryFilters";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    location?: string;
    lowStockOnly?: string;
    expiringOnly?: string;
    tag?: string;
  }>;
}) {
  const userId = await getUserId();
  if (!userId) return null;

  const { q, category, location, lowStockOnly, expiringOnly, tag } = await searchParams;

  const items = await prisma.item.findMany({
    where: {
      userId,
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
              { brand: { contains: q, mode: "insensitive" } },
              { locations: { some: { locationName: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
      ...(location ? { locations: { some: { locationName: { contains: location, mode: "insensitive" } } } } : {}),
      ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
    },
    include: { locations: true, tags: { include: { tag: true } } },
    orderBy: { name: "asc" },
  });

  let filtered = items;
  if (lowStockOnly === "true") filtered = filtered.filter((i) => isLowStock(i, i.locations));
  if (expiringOnly === "true") filtered = filtered.filter((i) => isExpiringSoon(i.expirationDate));

  const [vocabulary, allTags] = await Promise.all([
    getUserVocabulary(userId),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <div className="flex gap-2">
          <Link href="/scan" className="btn-secondary">
            <ScanLine size={16} /> Scan
          </Link>
          <Link href="/inventory/new" className="btn-primary">
            <Plus size={16} /> Add item
          </Link>
        </div>
      </div>

      <InventoryFilters
        categories={vocabulary.categories}
        locations={vocabulary.locations}
        tags={allTags.map((t) => t.name)}
      />

      {expiringOnly === "true" && <p className="mt-3 text-sm text-muted">Showing items expiring within 7 days.</p>}
      {location && (
        <p className="mt-3 text-sm text-muted">
          Showing items stored in <span className="font-medium">{location}</span>.
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-muted">No items match. Try adjusting filters, or add your first item.</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        {filtered.length} item{filtered.length === 1 ? "" : "s"} · {filtered.reduce((s, i) => s + totalQuantity(i.locations), 0)}{" "}
        total units
      </p>
    </div>
  );
}

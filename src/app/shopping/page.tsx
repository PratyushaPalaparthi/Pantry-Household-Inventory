import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { totalQuantity } from "@/lib/inventory";
import { ShoppingList, type LowStockItem } from "@/components/ShoppingList";

export default async function ShoppingPage() {
  const userId = await getUserId();
  if (!userId) return null;

  const items = await prisma.item.findMany({
    where: { userId },
    include: { locations: true },
  });

  const lowStockItems: LowStockItem[] = items
    .filter((item) => totalQuantity(item.locations) <= item.lowStockThreshold)
    .map((item) => ({
      id: item.id,
      name: item.name,
      unitOfMeasure: item.unitOfMeasure,
      preferredStore: item.preferredStore,
      totalQuantity: totalQuantity(item.locations),
      threshold: item.lowStockThreshold,
    }));

  const [manualEntries, stores] = await Promise.all([
    prisma.shoppingListEntry.findMany({
      where: { userId, isManual: true, isDone: false },
      orderBy: { createdAt: "asc" },
    }),
    // The normalised store list, so the picker offers every shop already seen on
    // a receipt rather than only ones typed here.
    prisma.store.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-2xl font-semibold">Shopping list</h1>
      <ShoppingList
        knownStores={stores.map((s) => s.name)}
        lowStockItems={lowStockItems}
        manualEntries={manualEntries.map((e) => ({
          id: e.id,
          text: e.text,
          unitOfMeasure: e.unitOfMeasure,
          storeHint: e.storeHint,
        }))}
      />
    </div>
  );
}

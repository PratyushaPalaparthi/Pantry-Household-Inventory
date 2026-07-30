import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toDateInputValue } from "@/lib/dates";
import { getUserId } from "@/lib/session";
import { getUserVocabulary } from "@/lib/inventory";
import { ItemForm } from "@/components/ItemForm";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return null;

  const [item, vocabulary] = await Promise.all([
    prisma.item.findUnique({
      where: { id },
      include: { locations: true, tags: { include: { tag: true } } },
    }),
    getUserVocabulary(userId),
  ]);

  if (!item || item.userId !== userId) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-2xl font-semibold">Edit item</h1>
      <ItemForm
        knownCategories={vocabulary.categories}
        knownLocations={vocabulary.locations}
        initial={{
          id: item.id,
          name: item.name,
          category: item.category,
          unitOfMeasure: item.unitOfMeasure,
          lowStockThreshold: item.lowStockThreshold,
          notes: item.notes ?? "",
          brand: item.brand ?? "",
          preferredStore: item.preferredStore ?? "",
          expirationDate: item.expirationDate ? toDateInputValue(item.expirationDate) : "",
          barcode: item.barcode ?? "",
          locations: item.locations.map((l) => ({ locationName: l.locationName, quantity: l.quantity })),
          tags: item.tags.map((t) => t.tag.name),
          imageUrl: item.imageUrl,
        }}
      />
    </div>
  );
}

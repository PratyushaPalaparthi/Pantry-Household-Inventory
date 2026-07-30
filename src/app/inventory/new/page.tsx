import { getUserId } from "@/lib/session";
import { getUserVocabulary } from "@/lib/inventory";
import { ItemForm } from "@/components/ItemForm";
import { storedImageName } from "@/lib/image-src";
import { userOwnsUpload } from "@/lib/storage";

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string; name?: string; imageUrl?: string }>;
}) {
  const userId = await getUserId();
  if (!userId) return null;

  const { barcode, name, imageUrl: rawImageUrl } = await searchParams;

  // ?imageUrl= arrives from the URL, so it is never trusted. Two checks: the
  // shape must be one of our own /api/files/<name> paths, and the file must
  // actually belong to this user. The second check matters because otherwise a
  // crafted link could probe which filenames exist by whether an image loads.
  const candidateName = storedImageName(rawImageUrl);
  const imageUrl =
    candidateName && (await userOwnsUpload(candidateName, userId)) ? `/api/files/${candidateName}` : null;

  const hasPrefill = Boolean(barcode || name || imageUrl);
  const vocabulary = await getUserVocabulary(userId);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-2xl font-semibold">Add item</h1>
      <ItemForm
        knownCategories={vocabulary.categories}
        knownLocations={vocabulary.locations}
        initial={
          hasPrefill
            ? {
                name: name ?? "",
                category: "",
                unitOfMeasure: "each",
                lowStockThreshold: 1,
                notes: "",
                brand: "",
                preferredStore: "",
                expirationDate: "",
                barcode: barcode ?? "",
                locations: [{ locationName: vocabulary.locations[0] ?? "Pantry", quantity: 1 }],
                tags: [],
                imageUrl: imageUrl ?? null,
              }
            : undefined
        }
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { getUserVocabulary } from "@/lib/inventory";
import { ReceiptConfirmation } from "@/components/ReceiptConfirmation";

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return null;

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!receipt || receipt.userId !== userId) notFound();

  const [items, vocabulary] = await Promise.all([
    prisma.item.findMany({
      where: { userId },
      select: { id: true, name: true, category: true, unitOfMeasure: true },
      orderBy: { name: "asc" },
    }),
    getUserVocabulary(userId),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">{receipt.storeName ?? "Receipt"}</h1>
      <p className="mb-5 text-sm text-muted">{receipt.uploadedAt.toLocaleString()}</p>

      {receipt.parsedStatus === "processing" && <p className="text-muted">Still processing…</p>}
      {receipt.parsedStatus === "failed" && (
        <p className="text-[var(--danger)]">
          Couldn&apos;t parse this receipt. The photo may be too blurry, or the AI provider isn&apos;t reachable — check
          Settings/environment configuration and try again.
        </p>
      )}
      {(receipt.parsedStatus === "needs_review" || receipt.parsedStatus === "confirmed") && (
        <ReceiptConfirmation
          receiptId={receipt.id}
          storeName={receipt.storeName ?? ""}
          confirmed={receipt.parsedStatus === "confirmed"}
          items={items}
          knownCategories={vocabulary.categories}
          knownLocations={vocabulary.locations}
          lines={receipt.lines.map((l) => ({
            id: l.id,
            rawText: l.rawText,
            parsedName: l.parsedName ?? l.rawText,
            quantity: l.quantity ?? 1,
            unitOfMeasure: l.unitOfMeasure ?? "each",
            price: l.price ?? 0,
            matchedItemId: l.matchedItemId,
            status: l.status,
          }))}
        />
      )}
    </div>
  );
}

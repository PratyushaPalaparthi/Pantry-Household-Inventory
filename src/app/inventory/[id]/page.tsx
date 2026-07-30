import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { totalQuantity, isLowStock, isExpiringSoon, isExpired } from "@/lib/inventory";
import { formatCalendarDate } from "@/lib/dates";
import { storedImageName } from "@/lib/image-src";
import { DeleteItemButton } from "@/components/DeleteItemButton";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return null;

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      locations: true,
      tags: { include: { tag: true } },
      priceHistory: { include: { store: true }, orderBy: { date: "asc" } },
    },
  });

  if (!item || item.userId !== userId) notFound();

  const total = totalQuantity(item.locations);
  const low = isLowStock(item, item.locations);
  const expiring = isExpiringSoon(item.expirationDate);
  const expired = isExpired(item.expirationDate);

  const cheapest = item.priceHistory.reduce<typeof item.priceHistory[number] | null>((min, p) => {
    if (!min || p.price < min.price) return p;
    return min;
  }, null);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
            style={{ background: "var(--brand-soft)" }}
          >
            {storedImageName(item.imageUrl) ? (
              <img
            src={`/api/files/${storedImageName(item.imageUrl)}`}
            alt={item.name}
            className="h-full w-full object-cover"
          />
            ) : (
              <span className="text-3xl">📦</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{item.name}</h1>
            <p className="text-muted">{item.category}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {low && <span className="badge-danger">Low stock</span>}
              {expired && <span className="badge-danger">Expired</span>}
              {!expired && expiring && <span className="badge-warning">Expiring soon</span>}
              {item.tags.map(({ tag }) => (
                <span key={tag.id} className="badge-brand">
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/inventory/${item.id}/edit`} className="btn-secondary !px-3 !py-2">
            <Pencil size={16} />
          </Link>
          <DeleteItemButton itemId={item.id} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-medium">Stock</h2>
          <p className="text-3xl font-semibold" style={low ? { color: "var(--danger)" } : undefined}>
            {total} <span className="text-base font-normal text-muted">{item.unitOfMeasure}</span>
          </p>
          <p className="mb-3 text-xs text-muted">Low-stock threshold: {item.lowStockThreshold}</p>
          <div className="space-y-1.5">
            {item.locations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted">
                  <MapPin size={13} /> {loc.locationName}
                </span>
                <span className="font-medium">
                  {loc.quantity} {item.unitOfMeasure}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-medium">Details</h2>
          <dl className="space-y-2 text-sm">
            {item.brand && (
              <div className="flex justify-between">
                <dt className="text-muted">Brand</dt>
                <dd>{item.brand}</dd>
              </div>
            )}
            {item.preferredStore && (
              <div className="flex justify-between">
                <dt className="text-muted">Preferred store</dt>
                <dd>{item.preferredStore}</dd>
              </div>
            )}
            {item.expirationDate && (
              <div className="flex justify-between">
                <dt className="text-muted">Expires</dt>
                <dd>{formatCalendarDate(item.expirationDate)}</dd>
              </div>
            )}
            {cheapest && (
              <div className="flex justify-between">
                <dt className="text-muted">Cheapest seen</dt>
                <dd>
                  ${cheapest.price.toFixed(2)} at {cheapest.store.name}
                </dd>
              </div>
            )}
            {item.notes && (
              <div>
                <dt className="mb-1 text-muted">Notes</dt>
                <dd>{item.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="card mt-4 p-5">
        <h2 className="mb-3 font-medium">Price history</h2>
        <PriceHistoryChart data={item.priceHistory.map((p) => ({ date: p.date.toISOString(), price: p.price, store: p.store.name }))} />
      </div>
    </div>
  );
}

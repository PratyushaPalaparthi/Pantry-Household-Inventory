import Link from "next/link";
import { Package, MapPin } from "lucide-react";
import type { Item, ItemLocation, ItemTag, Tag } from "@prisma/client";
import { totalQuantity, isLowStock, isExpiringSoon, isExpired } from "@/lib/inventory";
import { storedImageName } from "@/lib/image-src";

type ItemWithRelations = Item & {
  locations: ItemLocation[];
  tags: (ItemTag & { tag: Tag })[];
};

export function ItemCard({ item }: { item: ItemWithRelations }) {
  const total = totalQuantity(item.locations);
  const low = isLowStock(item, item.locations);
  const expiring = isExpiringSoon(item.expirationDate);
  const expired = isExpired(item.expirationDate);

  return (
    <Link
      href={`/inventory/${item.id}`}
      className="card flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5"
      style={low ? { borderColor: "var(--danger)" } : undefined}
    >
      <div className="relative flex h-32 items-center justify-center" style={{ background: "var(--brand-soft)" }}>
        {storedImageName(item.imageUrl) ? (
          <img
            src={`/api/files/${storedImageName(item.imageUrl)}`}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Package size={32} style={{ color: "var(--brand)" }} />
        )}
        {low && <span className="badge-danger absolute right-2 top-2">Low stock</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-sm font-medium leading-tight">{item.name}</p>
        <p className="text-xs text-muted">{item.category}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-semibold" style={low ? { color: "var(--danger)" } : undefined}>
            {total} {item.unitOfMeasure}
          </span>
          {(expiring || expired) && (
            <span className={expired ? "badge-danger" : "badge-warning"}>{expired ? "Expired" : "Expiring soon"}</span>
          )}
        </div>
        {/* Always shown, including for a single location — "where is this?" is
            one of the main questions the list has to answer. */}
        {item.locations.length > 0 && (
          <p className="flex items-start gap-1 text-[11px] text-muted">
            <MapPin size={11} className="mt-[2px] shrink-0" />
            <span>
              {item.locations.length === 1
                ? item.locations[0].locationName
                : item.locations.map((l) => `${l.quantity} ${l.locationName}`).join(" · ")}
            </span>
          </p>
        )}
      </div>
    </Link>
  );
}

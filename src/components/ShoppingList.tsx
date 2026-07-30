"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Store as StoreIcon } from "lucide-react";
import { RestockModal } from "@/components/RestockModal";
import { OptionSelect } from "@/components/OptionSelect";

export interface LowStockItem {
  id: string;
  name: string;
  unitOfMeasure: string;
  preferredStore: string | null;
  totalQuantity: number;
  threshold: number;
}

export interface ManualEntry {
  id: string;
  text: string;
  unitOfMeasure: string | null;
  storeHint: string | null;
}

export function ShoppingList({
  lowStockItems,
  manualEntries,
  knownStores = [],
}: {
  lowStockItems: LowStockItem[];
  manualEntries: ManualEntry[];
  knownStores?: string[];
}) {
  const router = useRouter();
  const [restocking, setRestocking] = useState<LowStockItem | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [newItemStore, setNewItemStore] = useState("");
  const [adding, setAdding] = useState(false);

  // Every store already referenced anywhere: the normalised Store table, the
  // items' preferred stores, and any typed on existing entries.
  const storeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...knownStores,
            ...lowStockItems.map((i) => i.preferredStore ?? ""),
            ...manualEntries.map((e) => e.storeHint ?? ""),
          ]
            .map((s) => s.trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [knownStores, lowStockItems, manualEntries]
  );

  const groups = useMemo(() => {
    const map = new Map<string, { lowStock: LowStockItem[]; manual: ManualEntry[] }>();
    const bucket = (store: string | null) => store?.trim() || "Any store";

    for (const item of lowStockItems) {
      const key = bucket(item.preferredStore);
      if (!map.has(key)) map.set(key, { lowStock: [], manual: [] });
      map.get(key)!.lowStock.push(item);
    }
    for (const entry of manualEntries) {
      const key = bucket(entry.storeHint);
      if (!map.has(key)) map.set(key, { lowStock: [], manual: [] });
      map.get(key)!.manual.push(entry);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a === "Any store" ? 1 : a.localeCompare(b)));
  }, [lowStockItems, manualEntries]);

  async function toggleManualDone(id: string) {
    await fetch(`/api/shopping/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: true }),
    });
    router.refresh();
  }

  async function changeStore(id: string, storeHint: string) {
    await fetch(`/api/shopping/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeHint }),
    });
    router.refresh();
  }

  async function deleteManual(id: string) {
    await fetch(`/api/shopping/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleAddManual(e: React.FormEvent) {
    e.preventDefault();
    const text = newItemText.trim();
    if (!text) return;
    setAdding(true);
    await fetch("/api/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, storeHint: newItemStore || undefined }),
    });
    setNewItemText("");
    // Deliberately keep the store selected: you usually add several things for
    // the same trip in a row.
    setAdding(false);
    router.refresh();
  }

  const isEmpty = lowStockItems.length === 0 && manualEntries.length === 0;

  return (
    <div className="space-y-5">
      <form onSubmit={handleAddManual} className="card space-y-2 p-3">
        <input
          className="input"
          placeholder="Add anything, e.g. birthday candles"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
        />
        <div className="flex gap-2">
          <div className="flex-1">
            {/* Picking the store up front is what makes the grouping below
                useful — otherwise every manual item lands in "Any store". */}
            <OptionSelect
              value={newItemStore}
              onChange={setNewItemStore}
              options={storeOptions}
              emptyOptionLabel="Any store"
              customPlaceholder="New store name"
            />
          </div>
          <button type="submit" disabled={adding} className="btn-primary shrink-0">
            <Plus size={16} /> Add
          </button>
        </div>
      </form>

      {isEmpty && <p className="text-center text-muted">Nothing to buy right now. Nice.</p>}

      {groups.map(([store, { lowStock, manual }]) => (
        <div key={store} className="card p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted">
            <StoreIcon size={14} /> {store}
          </div>
          <div className="space-y-1.5">
            {lowStock.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5" style={{ background: "var(--danger-soft)" }}>
                <input type="checkbox" className="h-4 w-4 shrink-0" onChange={() => setRestocking(item)} />
                <div className="flex-1">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="ml-2 text-xs" style={{ color: "var(--danger)" }}>
                    {item.totalQuantity} / {item.threshold} {item.unitOfMeasure}
                  </span>
                </div>
                <span className="badge-danger">Low</span>
              </div>
            ))}
            {manual.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                <input type="checkbox" className="h-4 w-4 shrink-0" onChange={() => toggleManualDone(entry.id)} />
                <span className="flex-1 text-sm">{entry.text}</span>
                {/* Move an item to a different store without retyping it. */}
                <select
                  className="shrink-0 rounded-md px-2 py-1 text-xs"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
                  value={entry.storeHint ?? ""}
                  onChange={(e) => changeStore(entry.id, e.target.value)}
                  aria-label={`Store for ${entry.text}`}
                >
                  <option value="">Any store</option>
                  {storeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => deleteManual(entry.id)}
                  className="text-muted hover:text-[var(--danger)]"
                  aria-label={`Remove ${entry.text}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {restocking && (
        <RestockModal
          itemId={restocking.id}
          itemName={restocking.name}
          unitOfMeasure={restocking.unitOfMeasure}
          defaultStore={restocking.preferredStore}
          onClose={() => setRestocking(null)}
        />
      )}
    </div>
  );
}

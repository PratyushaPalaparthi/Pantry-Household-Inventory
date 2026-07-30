"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RestockModal({
  itemId,
  itemName,
  unitOfMeasure,
  defaultStore,
  onClose,
}: {
  itemId: string;
  itemName: string;
  unitOfMeasure: string;
  defaultStore: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");
  const [storeName, setStoreName] = useState(defaultStore ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/items/${itemId}/restock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity,
        price: price ? Number(price) : undefined,
        storeName: storeName || undefined,
      }),
    });
    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 font-medium">Restock {itemName}</h3>
        <p className="mb-4 text-xs text-muted">Log what you bought to update stock and price history.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Quantity purchased ({unitOfMeasure})</label>
            <input
              type="number"
              min={0.01}
              step="any"
              required
              className="input"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Price paid (optional)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              placeholder="e.g. 8.99"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Store (optional)</label>
            <input className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Saving…" : "Restock"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

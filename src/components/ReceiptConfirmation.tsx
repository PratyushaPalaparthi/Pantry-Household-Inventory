"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, UNIT_GROUPS, COMMON_LOCATIONS, mergeOptions } from "@/lib/options";
import { OptionSelect } from "@/components/OptionSelect";
import { FormAlert } from "@/components/FormAlert";

interface Item {
  id: string;
  name: string;
  category: string;
  unitOfMeasure: string;
}

interface Line {
  id: string;
  rawText: string;
  parsedName: string;
  quantity: number;
  unitOfMeasure: string;
  price: number;
  matchedItemId: string | null;
  status: string;
}

type Action = "match" | "create" | "ignore";

interface LineState {
  action: Action;
  itemId: string;
  name: string;
  category: string;
  unitOfMeasure: string;
  quantity: number;
  price: number;
  brand: string;
  expirationDate: string;
  locationName: string;
}

export function ReceiptConfirmation({
  receiptId,
  storeName: initialStoreName,
  confirmed,
  items,
  lines,
  knownCategories = [],
  knownLocations = [],
}: {
  receiptId: string;
  storeName: string;
  confirmed: boolean;
  items: Item[];
  lines: Line[];
  knownCategories?: string[];
  knownLocations?: string[];
}) {
  const router = useRouter();
  const categoryOptions = mergeOptions(knownCategories, CATEGORIES);
  const locationOptions = mergeOptions(knownLocations, COMMON_LOCATIONS);
  const [storeName, setStoreName] = useState(initialStoreName);
  const [states, setStates] = useState<Record<string, LineState>>(() =>
    Object.fromEntries(
      lines.map((l) => [
        l.id,
        {
          action: (l.status === "ignored" ? "ignore" : l.matchedItemId ? "match" : "create") as Action,
          itemId: l.matchedItemId ?? "",
          name: l.parsedName,
          category: "",
          unitOfMeasure: l.unitOfMeasure,
          quantity: l.quantity,
          price: l.price,
          brand: "",
          expirationDate: "",
          locationName: "",
        },
      ])
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLine(id: string, patch: Partial<LineState>) {
    setStates((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  }

  async function handleConfirm() {
    setError(null);

    const decisions = lines.map((l) => {
      const s = states[l.id];
      if (s.action === "ignore") return { lineId: l.id, action: "ignore" as const };
      if (s.action === "match") {
        return {
          lineId: l.id,
          action: "match" as const,
          itemId: s.itemId,
          quantity: s.quantity,
          price: s.price,
          // The expiry field is shown for matched lines too — a fresh carton of
          // milk resets the date — so it has to be sent, not just collected.
          expirationDate: s.expirationDate || undefined,
        };
      }
      return {
        lineId: l.id,
        action: "create" as const,
        name: s.name,
        category: s.category,
        unitOfMeasure: s.unitOfMeasure,
        quantity: s.quantity,
        price: s.price,
        brand: s.brand || undefined,
        expirationDate: s.expirationDate || undefined,
        ...(s.locationName ? { locationName: s.locationName } : {}),
      };
    });

    const invalid = decisions.find(
      (d) => (d.action === "match" && !d.itemId) || (d.action === "create" && (!("name" in d) || !d.name || !d.category))
    );
    if (invalid) {
      setError("Every line needs either a matched item, or a name + category to create one (or mark it ignored).");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/receipts/${receiptId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeName, decisions }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to confirm receipt.");
      return;
    }

    router.push("/receipts");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <label className="label">Store</label>
        <input
          className="input"
          value={storeName}
          disabled={confirmed}
          onChange={(e) => setStoreName(e.target.value)}
        />
      </div>

      {lines.map((line) => {
        const s = states[line.id];
        return (
          <div key={line.id} className="card p-4">
            <p className="mb-2 text-xs text-muted">&ldquo;{line.rawText}&rdquo;</p>

            {!confirmed && (
              <div className="mb-3 flex gap-1.5">
                {(["match", "create", "ignore"] as Action[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => updateLine(line.id, { action: a })}
                    className={s.action === a ? "badge-brand" : "badge"}
                    style={s.action !== a ? { background: "var(--surface)", border: "1px solid var(--border)" } : undefined}
                  >
                    {a === "match" ? "Match existing" : a === "create" ? "Create new" : "Ignore"}
                  </button>
                ))}
              </div>
            )}

            {s.action === "match" && (
              <select
                className="input mb-2"
                disabled={confirmed}
                value={s.itemId}
                onChange={(e) => updateLine(line.id, { itemId: e.target.value })}
              >
                <option value="">Select an item…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.category})
                  </option>
                ))}
              </select>
            )}

            {s.action === "create" && (
              <div className="mb-2 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="label !mb-1 text-xs">Item name</label>
                    <input
                      className="input"
                      placeholder="Item name"
                      disabled={confirmed}
                      value={s.name}
                      onChange={(e) => updateLine(line.id, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label !mb-1 text-xs">Category</label>
                    <OptionSelect
                      value={s.category}
                      onChange={(category) => updateLine(line.id, { category })}
                      options={categoryOptions}
                      placeholder="Select a category…"
                      customPlaceholder="New category"
                    />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="label !mb-1 text-xs">Brand (optional)</label>
                    <input
                      className="input"
                      placeholder="e.g. Kirkland"
                      disabled={confirmed}
                      value={s.brand}
                      onChange={(e) => updateLine(line.id, { brand: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label !mb-1 text-xs">Store in</label>
                    <OptionSelect
                      value={s.locationName}
                      onChange={(locationName) => updateLine(line.id, { locationName })}
                      options={locationOptions}
                      placeholder="Select a location…"
                      customPlaceholder="New location"
                    />
                  </div>
                </div>
              </div>
            )}

            {s.action !== "ignore" && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <label className="label !mb-1 text-xs">Quantity</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    disabled={confirmed}
                    value={s.quantity}
                    onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label !mb-1 text-xs">Unit</label>
                  <OptionSelect
                    value={s.unitOfMeasure}
                    onChange={(unitOfMeasure) => updateLine(line.id, { unitOfMeasure })}
                    groups={UNIT_GROUPS.map((g) => ({ label: g.label, options: g.units }))}
                    placeholder="Unit…"
                    customPlaceholder="New unit"
                  />
                </div>
                <div>
                  <label className="label !mb-1 text-xs">Price</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    disabled={confirmed}
                    value={s.price}
                    onChange={(e) => updateLine(line.id, { price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  {/* Perishables are the whole reason to log a receipt promptly,
                      so the expiry goes here rather than a later edit trip. */}
                  <label className="label !mb-1 text-xs">Expires (optional)</label>
                  <input
                    className="input"
                    type="date"
                    disabled={confirmed}
                    value={s.expirationDate}
                    onChange={(e) => updateLine(line.id, { expirationDate: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {error && <FormAlert>{error}</FormAlert>}

      {!confirmed && (
        <button onClick={handleConfirm} disabled={saving} className="btn-primary w-full">
          {saving ? "Applying…" : "Confirm & update inventory"}
        </button>
      )}
    </div>
  );
}

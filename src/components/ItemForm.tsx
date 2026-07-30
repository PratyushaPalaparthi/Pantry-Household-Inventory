"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Upload, Sparkles, Loader2 } from "lucide-react";
import { CATEGORIES, UNIT_GROUPS, COMMON_LOCATIONS, mergeOptions } from "@/lib/options";
import { OptionSelect } from "@/components/OptionSelect";
import { FormAlert } from "@/components/FormAlert";
import { storedImageName } from "@/lib/image-src";

export interface ItemFormLocation {
  locationName: string;
  quantity: number;
}

export interface ItemFormValues {
  id?: string;
  name: string;
  category: string;
  unitOfMeasure: string;
  lowStockThreshold: number;
  notes: string;
  brand: string;
  preferredStore: string;
  expirationDate: string;
  barcode: string;
  locations: ItemFormLocation[];
  tags: string[];
  imageUrl: string | null;
}

export function ItemForm({
  initial,
  knownCategories = [],
  knownLocations = [],
}: {
  initial?: ItemFormValues;
  knownCategories?: string[];
  knownLocations?: string[];
}) {
  const router = useRouter();

  // The user's own categories/locations lead, then the built-in defaults. Their
  // real vocabulary is the most likely pick, and it keeps a value they invented
  // earlier from disappearing off the list.
  const categoryOptions = mergeOptions(knownCategories, CATEGORIES);
  const locationOptions = mergeOptions(knownLocations, COMMON_LOCATIONS);

  const [values, setValues] = useState<ItemFormValues>(
    initial ?? {
      name: "",
      category: "",
      unitOfMeasure: "each",
      lowStockThreshold: 1,
      notes: "",
      brand: "",
      preferredStore: "",
      expirationDate: "",
      barcode: "",
      locations: [{ locationName: "Pantry", quantity: 1 }],
      tags: [],
      imageUrl: null,
    }
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Derived from the prop rather than copied into state: only the stored
  // filename, never a URL string, and the <img src> is rebuilt from a literal
  // template so no free-form URL can reach the DOM.
  const savedImageName = storedImageName(initial?.imageUrl);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLocation(index: number, patch: Partial<ItemFormLocation>) {
    setValues((v) => ({
      ...v,
      locations: v.locations.map((loc, i) => (i === index ? { ...loc, ...patch } : loc)),
    }));
  }

  function addLocation() {
    setValues((v) => ({ ...v, locations: [...v.locations, { locationName: "", quantity: 0 }] }));
  }

  function removeLocation(index: number) {
    setValues((v) => ({ ...v, locations: v.locations.filter((_, i) => i !== index) }));
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !values.tags.includes(t)) {
      setValues((v) => ({ ...v, tags: [...v.tags, t] }));
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setValues((v) => ({ ...v, tags: v.tags.filter((t) => t !== tag) }));
  }

  // Derived, not stored: a freshly picked file wins over the saved image.
  const pickedPreviewUrl = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : null), [photoFile]);

  // A freshly picked file wins; otherwise show the already-saved image. Built
  // from a literal template so the only variable part is a filename that
  // already matched the strict pattern in storedImageName().
  const previewSrc = pickedPreviewUrl ?? (savedImageName ? `/api/files/${savedImageName}` : null);

  // The previous version never revoked these, leaking a blob per photo picked.
  useEffect(() => {
    if (!pickedPreviewUrl) return;
    return () => URL.revokeObjectURL(pickedPreviewUrl);
  }, [pickedPreviewUrl]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // A picked file takes precedence over the saved image via previewSrc, so
    // there is no separate saved-image state to clear.
    setPhotoFile(file);
  }

  async function handleSuggest() {
    if (!photoFile) return;
    setSuggesting(true);
    setError(null);

    const fd = new FormData();
    fd.set("photo", photoFile);
    const res = await fetch("/api/ai/photo-suggest", { method: "POST", body: fd });
    const data = await res.json();
    setSuggesting(false);

    if (!res.ok) {
      setError(data.error ?? "Couldn't get a suggestion for this photo.");
      return;
    }

    setValues((v) => ({
      ...v,
      name: v.name || data.name || v.name,
      category: v.category || data.category || v.category,
      notes: v.notes || data.notes || v.notes,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (values.locations.length === 0 || values.locations.some((l) => !l.locationName.trim())) {
      setError("Every location needs a name. Add at least one location.");
      return;
    }

    setSaving(true);
    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("category", values.category);
    fd.set("unitOfMeasure", values.unitOfMeasure);
    fd.set("lowStockThreshold", String(values.lowStockThreshold));
    fd.set("notes", values.notes);
    fd.set("brand", values.brand);
    fd.set("preferredStore", values.preferredStore);
    fd.set("expirationDate", values.expirationDate);
    fd.set("barcode", values.barcode);
    fd.set("locations", JSON.stringify(values.locations));
    fd.set("tags", JSON.stringify(values.tags));
    if (photoFile) fd.set("photo", photoFile);
    else if (values.imageUrl) fd.set("imageUrl", values.imageUrl);

    const url = values.id ? `/api/items/${values.id}` : "/api/items";
    const method = values.id ? "PATCH" : "POST";

    const res = await fetch(url, { method, body: fd });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save item.");
      return;
    }

    const item = await res.json();
    router.push(`/inventory/${item.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <label className="group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed" style={{ borderColor: "var(--border)" }}>
            {previewSrc ? (
              /* Snyk flags this as DOM-XSS (javascript/DOMXSS). It is a false positive
                 and cannot be resolved in code: the rule's taint source is the
                 useState<File> above, and previewSrc is either
                   - URL.createObjectURL(file) — a blob: URL minted by the browser
                     from a local File, so it cannot carry an attacker scheme, or
                   - `/api/files/${name}` — a literal template whose only variable
                     part already matched storedImageName()'s strict pattern (no
                     scheme, slash, "..", or whitespace), and which the new-item page
                     additionally checks for per-user ownership.
                 Previewing a picked file inherently requires state -> createObjectURL
                 -> src, so no restructuring clears it. Snyk Code ignores cannot live
                 in the repo (.snyk does not support Snyk Code, and inline
                 "deepcode ignore" is not honoured) — suppress it in the Snyk UI. */
              <img src={previewSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <Upload size={22} className="text-muted" />
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
          </label>

          <div className="flex-1 space-y-3">
            {photoFile && (
              <button
                type="button"
                onClick={handleSuggest}
                disabled={suggesting}
                className="btn-secondary !py-1.5 text-xs"
              >
                {suggesting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {suggesting ? "Looking at photo…" : "Suggest name & category"}
              </button>
            )}
            <div>
              <label className="label">Item name</label>
              <input
                className="input"
                required
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                placeholder="e.g. Olive Oil"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="item-category">
                  Category
                </label>
                <OptionSelect
                  id="item-category"
                  required
                  value={values.category}
                  onChange={(category) => setValues((v) => ({ ...v, category }))}
                  options={categoryOptions}
                  placeholder="Select a category…"
                  customPlaceholder="New category name"
                />
              </div>
              <div>
                <label className="label" htmlFor="item-unit">
                  Unit of measure
                </label>
                <OptionSelect
                  id="item-unit"
                  required
                  value={values.unitOfMeasure}
                  onChange={(unitOfMeasure) => setValues((v) => ({ ...v, unitOfMeasure }))}
                  groups={UNIT_GROUPS.map((g) => ({ label: g.label, options: g.units }))}
                  placeholder="Select a unit…"
                  customPlaceholder="New unit"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Storage locations</h2>
          <button type="button" onClick={addLocation} className="btn-secondary !px-3 !py-1.5 text-xs">
            <Plus size={14} /> Add location
          </button>
        </div>
        <div className="space-y-2">
          {values.locations.map((loc, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <OptionSelect
                  value={loc.locationName}
                  onChange={(locationName) => updateLocation(i, { locationName })}
                  options={locationOptions}
                  placeholder="Select a location…"
                  customPlaceholder="New location name"
                />
              </div>
              <input
                className="input w-28"
                type="number"
                min={0}
                step="any"
                value={loc.quantity}
                onChange={(e) => updateLocation(i, { quantity: Number(e.target.value) })}
              />
              <button
                type="button"
                onClick={() => removeLocation(i)}
                disabled={values.locations.length === 1}
                className="btn-secondary !px-2.5 !py-2.5 disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Total on hand: {values.locations.reduce((s, l) => s + (Number(l.quantity) || 0), 0)} {values.unitOfMeasure}
        </p>
      </div>

      <div className="card space-y-3 p-5">
        <div>
          <label className="label">Low-stock threshold</label>
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            value={values.lowStockThreshold}
            onChange={(e) => setValues((v) => ({ ...v, lowStockThreshold: Number(e.target.value) }))}
          />
          <p className="mt-1 text-xs text-muted">Flagged low when total on hand drops to this level or below.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Brand</label>
            <input className="input" value={values.brand} onChange={(e) => setValues((v) => ({ ...v, brand: e.target.value }))} />
          </div>
          <div>
            <label className="label">Preferred store</label>
            <input
              className="input"
              value={values.preferredStore}
              onChange={(e) => setValues((v) => ({ ...v, preferredStore: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="label">Expiration date</label>
          <input
            className="input"
            type="date"
            value={values.expirationDate}
            onChange={(e) => setValues((v) => ({ ...v, expirationDate: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={2}
            value={values.notes}
            onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Tags</label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {values.tags.map((t) => (
              <span key={t} className="badge-brand cursor-pointer" onClick={() => removeTag(t)}>
                {t} ✕
              </span>
            ))}
          </div>
          <input
            className="input"
            placeholder="Type a tag and press Enter (e.g. emergency kit)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
        </div>
      </div>

      {error && <FormAlert>{error}</FormAlert>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : values.id ? "Save changes" : "Add item"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

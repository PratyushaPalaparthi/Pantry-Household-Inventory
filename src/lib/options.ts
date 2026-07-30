/**
 * Shared option lists for the category / unit / location dropdowns.
 *
 * These are *defaults*, not a closed set. Every dropdown that uses them also
 * offers "Other…" and free text, because inventory vocabulary is personal —
 * your "Garage shelf" or "cây" is not something a fixed list can anticipate —
 * and because items created before a list changed must keep their old value.
 */

export const CATEGORIES = [
  "Pantry",
  "Refrigerated",
  "Frozen",
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Beverages",
  "Coffee & Tea",
  "Snacks",
  "Baking",
  "Spices & Condiments",
  "Canned & Jarred",
  "Grains & Pasta",
  "Sauces & Oils",
  "International",
  "Breakfast & Cereal",
  "Baby",
  "Pet Supplies",
  "Cleaning Supplies",
  "Laundry",
  "Paper Goods",
  "Toiletries",
  "Health & Medicine",
  "First Aid",
  "Tools & Hardware",
  "Batteries & Bulbs",
  "Office Supplies",
  "Seasonal & Holiday",
  "Emergency Supplies",
  "Other",
] as const;

/** Grouped so the unit dropdown stays scannable instead of one long list. */
export const UNIT_GROUPS: { label: string; units: string[] }[] = [
  { label: "Count", units: ["each", "pair", "dozen", "pack", "box", "case", "bundle", "bunch", "head", "loaf", "roll"] },
  { label: "Containers", units: ["bottle", "can", "jar", "tub", "carton", "bag", "pouch", "sachet", "tube", "stick"] },
  { label: "Weight", units: ["lb", "oz", "kg", "g"] },
  { label: "Volume", units: ["gallon", "quart", "pint", "fl oz", "liter", "ml", "cup", "tbsp", "tsp"] },
  { label: "Length", units: ["ft", "m", "sq ft"] },
];


/** Seeds the location dropdown before the user has any locations of their own. */
export const COMMON_LOCATIONS = [
  "Pantry",
  "Kitchen cabinet",
  "Kitchen drawer",
  "Countertop",
  "Fridge",
  "Freezer",
  "Chest freezer",
  "Basement",
  "Garage",
  "Garage shelf",
  "Utility closet",
  "Laundry room",
  "Bathroom cabinet",
  "Medicine cabinet",
  "Linen closet",
  "Bedroom closet",
  "Under the stairs",
  "Shed",
  "Attic",
  "Car",
] as const;

/**
 * Merges the user's own values with the defaults: their real vocabulary first,
 * then the rest of the defaults, de-duplicated case-insensitively so "pantry"
 * and "Pantry" don't both appear.
 */
export function mergeOptions(existing: string[], defaults: readonly string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const value of [...existing, ...defaults]) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(value.trim());
  }
  return merged;
}

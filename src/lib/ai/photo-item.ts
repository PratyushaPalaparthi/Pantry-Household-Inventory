import { z } from "zod";
import { chatJSON } from "./client";

export interface PhotoItemSuggestion {
  name: string;
  category: string;
  notes: string | null;
}

// Vision models are markedly worse than text models at honouring an output
// shape — one tested model used the product name as the JSON *key* and looped
// until it hit the token limit. Validate rather than trusting the response, so a
// bad reply becomes a clear message instead of a raw JSON parse error.
const suggestionSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  notes: z.string().max(300).nullish().transform((value) => value ?? null),
});

const SYSTEM_PROMPT = `You are a household inventory assistant. You are shown a photo of a single household or grocery item. Suggest a concise product name and a category for it.

Categories should be simple household groupings such as: Pantry, Refrigerated, Frozen, Produce, Beverages, Cleaning Supplies, Paper Goods, Toiletries, Health & Medicine, Baking, Spices & Condiments, Pet Supplies, Baby, Tools & Hardware, Office Supplies, Other.

Respond with ONLY a JSON object of this exact shape, no prose:
{ "name": string, "category": string, "notes": string | null }

"notes" may briefly capture brand or size if visible on packaging (e.g. "Kirkland, 40oz"), otherwise null.`;

export class PhotoSuggestionUnavailableError extends Error {
  constructor() {
    super(
      "The vision model didn't return a usable suggestion. Fill the item in by hand, " +
        "or try a clearer photo. A stronger AI_OLLAMA_VISION_MODEL will do better."
    );
    this.name = "PhotoSuggestionUnavailableError";
  }
}

export async function suggestItemFromPhoto(base64DataUrl: string): Promise<PhotoItemSuggestion> {
  let raw: unknown;
  try {
    raw = await chatJSON<unknown>({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Identify this item." },
            { type: "image_url", image_url: { url: base64DataUrl } },
          ],
        },
      ],
      temperature: 0.2,
      maxTokens: 300,
    });
  } catch (err) {
    // Unreachable endpoint / bad key / model-not-pulled all carry an actionable
    // message from the client, so let those through untouched. Anything else is
    // the model producing unparseable output.
    if (err instanceof SyntaxError) throw new PhotoSuggestionUnavailableError();
    throw err;
  }

  const parsed = suggestionSchema.safeParse(raw);
  if (!parsed.success) throw new PhotoSuggestionUnavailableError();

  return parsed.data;
}

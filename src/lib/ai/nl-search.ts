import { chatJSON } from "./client";

export interface ParsedSearchIntent {
  intent: "expiring" | "low_stock" | "location" | "category" | "text";
  location: string | null;
  category: string | null;
  daysAhead: number | null;
  searchText: string | null;
}

const SYSTEM_PROMPT = `You parse natural-language household inventory search queries into structured filters.

Examples:
"what's expiring this week" -> {"intent":"expiring","location":null,"category":null,"daysAhead":7,"searchText":null}
"what's low in the kitchen" -> {"intent":"low_stock","location":"kitchen","category":null,"daysAhead":null,"searchText":null}
"what's low on beverages" -> {"intent":"low_stock","location":null,"category":"beverages","daysAhead":null,"searchText":null}
"anything expiring in the next 3 days" -> {"intent":"expiring","location":null,"category":null,"daysAhead":3,"searchText":null}
"what's in the garage" -> {"intent":"location","location":"garage","category":null,"daysAhead":null,"searchText":null}
"find olive oil" -> {"intent":"text","location":null,"category":null,"daysAhead":null,"searchText":"olive oil"}

Respond with ONLY a JSON object of this exact shape, no prose:
{ "intent": "expiring" | "low_stock" | "location" | "category" | "text", "location": string | null, "category": string | null, "daysAhead": number | null, "searchText": string | null }`;

export async function parseSearchIntent(text: string): Promise<ParsedSearchIntent> {
  return chatJSON<ParsedSearchIntent>({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    temperature: 0,
    maxTokens: 200,
  });
}

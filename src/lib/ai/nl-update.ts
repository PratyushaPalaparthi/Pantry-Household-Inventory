import { chatJSON } from "./client";

export interface ParsedUpdateIntent {
  action: "consume" | "restock" | "unknown";
  itemQuery: string;
  quantityDelta: number | null;
  useAll: boolean;
}

const SYSTEM_PROMPT = `You parse short natural-language household inventory updates into structured intents.

Examples:
"used the last of the olive oil" -> {"action":"consume","itemQuery":"olive oil","quantityDelta":null,"useAll":true}
"bought 2 more paper towels" -> {"action":"restock","itemQuery":"paper towels","quantityDelta":2,"useAll":false}
"used 3 cans of black beans" -> {"action":"consume","itemQuery":"black beans","quantityDelta":3,"useAll":false}
"ran out of dish soap" -> {"action":"consume","itemQuery":"dish soap","quantityDelta":null,"useAll":true}
"picked up a dozen eggs" -> {"action":"restock","itemQuery":"eggs","quantityDelta":12,"useAll":false}

"itemQuery" should be the plain product name only, lowercase, no quantity words. If the phrase doesn't clearly describe a consume or restock action, set "action" to "unknown".

Respond with ONLY a JSON object of this exact shape, no prose:
{ "action": "consume" | "restock" | "unknown", "itemQuery": string, "quantityDelta": number | null, "useAll": boolean }`;

export async function parseUpdateIntent(text: string): Promise<ParsedUpdateIntent> {
  return chatJSON<ParsedUpdateIntent>({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    temperature: 0,
    maxTokens: 200,
  });
}

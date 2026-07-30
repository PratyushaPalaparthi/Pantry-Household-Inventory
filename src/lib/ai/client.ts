// Provider-agnostic AI client. Both Anthropic's Claude API and a local Ollama
// server expose an OpenAI-compatible /chat/completions endpoint, so a single
// fetch-based client can target either one — swap providers via AI_PROVIDER.

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
};

export interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export type AiProvider = "claude" | "ollama";

function currentProvider(): AiProvider {
  return process.env.AI_PROVIDER === "claude" ? "claude" : "ollama";
}

/** True when any message carries an image, i.e. the request needs a vision model. */
function needsVision(messages: ChatMessage[]): boolean {
  return messages.some(
    (message) => Array.isArray(message.content) && message.content.some((part) => part.type === "image_url")
  );
}

function providerConfig(vision: boolean) {
  const provider = currentProvider();
  if (provider === "claude") {
    return {
      provider,
      baseUrl: process.env.AI_CLAUDE_BASE_URL ?? "https://api.anthropic.com/v1",
      // Every current Claude model accepts images, so one model covers both.
      model: process.env.AI_CLAUDE_MODEL ?? "claude-sonnet-5",
      apiKey: process.env.ANTHROPIC_API_KEY,
    };
  }
  return {
    provider,
    baseUrl: process.env.AI_OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    // Local models are usually either good at text or able to see, rarely both,
    // so photo-to-item gets its own model. Without this split a text-only model
    // silently ignores the image and hallucinates an answer.
    model: vision
      ? process.env.AI_OLLAMA_VISION_MODEL ?? "llava:7b"
      : process.env.AI_OLLAMA_MODEL ?? "qwen2.5:7b",
    apiKey: undefined,
  };
}

async function chatCompletion(opts: ChatOptions): Promise<string> {
  const vision = needsVision(opts.messages);
  const { provider, baseUrl, model, apiKey } = providerConfig(vision);

  if (provider === "claude" && !apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set but AI_PROVIDER=claude");
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 1024,
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    // A connection-level failure almost always means the endpoint isn't running
    // or the URL is wrong — say so, since "fetch failed" tells the user nothing.
    const detail = err instanceof Error ? err.message : String(err);
    const hint =
      provider === "ollama"
        ? `Could not reach the local AI server at ${baseUrl}. Is Ollama running, and is AI_OLLAMA_BASE_URL correct?`
        : `Could not reach the Claude API at ${baseUrl}. Check network access and AI_CLAUDE_BASE_URL.`;
    throw new Error(`${hint} (${detail})`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const hint =
      res.status === 401 || res.status === 403
        ? provider === "claude"
          ? " Check that ANTHROPIC_API_KEY is valid."
          : " The AI server rejected the request as unauthorized."
        : res.status === 404 && provider === "ollama"
          ? ` Model "${model}" may not be pulled yet — try: ollama pull ${model}`
          : "";
    throw new Error(`AI provider (${provider}) request failed: ${res.status}${hint} ${text}`.trim());
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("AI provider returned an unexpected response shape");
  }
  return content;
}

// Best-effort JSON extraction — local models often wrap JSON in prose or
// markdown fences even when asked not to.
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = raw.indexOf("{");
  const firstBracket = raw.indexOf("[");
  const start =
    firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);
  if (start === -1) return raw.trim();
  return raw.slice(start).trim();
}

export async function chatJSON<T>(opts: ChatOptions): Promise<T> {
  const content = await chatCompletion({ ...opts, jsonMode: true });
  try {
    return JSON.parse(content) as T;
  } catch {
    return JSON.parse(extractJson(content)) as T;
  }
}

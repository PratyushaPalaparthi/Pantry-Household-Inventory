"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";

export function NaturalLanguageBar() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ kind: "error", text: data.error ?? "Something went wrong." });
        return;
      }

      if (data.type === "update_applied") {
        setMessage({ kind: "ok", text: data.message });
        setText("");
        router.refresh();
      } else if (data.type === "update_failed") {
        setMessage({ kind: "error", text: data.message });
      } else if (data.type === "search") {
        router.push(data.url);
        setText("");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder={`Try "used the last of the olive oil" or "what's low in the kitchen"`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary shrink-0">
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Go"}
        </button>
      </form>
      {message && (
        <p className="mt-2 text-sm" style={{ color: message.kind === "error" ? "var(--danger)" : "var(--brand)" }}>
          {message.text}
        </p>
      )}
    </div>
  );
}

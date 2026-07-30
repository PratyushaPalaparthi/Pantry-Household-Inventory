"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";

export function ReceiptUploadButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.set("photo", file);

    const res = await fetch("/api/receipts", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to process receipt.");
      return;
    }

    router.push(`/receipts/${data.id}`);
    router.refresh();
  }

  return (
    <div>
      <button onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-primary">
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Reading receipt…
          </>
        ) : (
          <>
            <Camera size={16} /> Scan receipt
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}

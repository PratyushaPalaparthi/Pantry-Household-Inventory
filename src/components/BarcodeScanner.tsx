"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanLine } from "lucide-react";
// Imported statically rather than via `await import(...)` inside the effect.
// A runtime dynamic import has to resolve a chunk id against the webpack client
// runtime, and a tab that was loaded before the last rebuild/redeploy has a
// stale runtime — the lookup then yields no filename and the request goes to
// "/_next/undefined". That's especially likely for an installed PWA left open
// across a deploy. html5-qrcode touches no browser globals at module scope
// (verified), so a static import is safe even though this component is also
// rendered on the server.
import { Html5Qrcode } from "html5-qrcode";

const SCANNER_ID = "barcode-reader";
const CAMERA_FALLBACK_MESSAGE = "Couldn't access the camera. You can still enter a barcode manually below.";

export function BarcodeScanner() {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [looking, setLooking] = useState(false);
  const lookingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (cancelled) return;

      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          if (!lookingRef.current) handleCode(decodedText);
        },
        () => {
          // per-frame decode miss — expected constantly while scanning, ignore
        }
      );
    }

    // Every failure path has to land here. Camera denied, no camera present,
    // insecure origin, or the scanner failing to initialise are all recoverable
    // — the manual barcode entry below still works. Calling start() without
    // catching would surface an unhandled rejection and take the page down
    // instead of degrading.
    start().catch(() => {
      if (!cancelled) setCameraError(CAMERA_FALLBACK_MESSAGE);
    });

    return () => {
      cancelled = true;
      scannerRef.current
        ?.stop()
        .then(() => scannerRef.current?.clear())
        .catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCode(code: string) {
    if (lookingRef.current) return;
    lookingRef.current = true;
    setLooking(true);

    try {
      scannerRef.current?.pause(true);
    } catch {
      // Scanner may never have successfully started (e.g. no camera) — a
      // manual barcode entry should still work regardless.
    }

    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(code)}`);
      const data = await res.json();

      if (data.existingItem) {
        router.push(`/inventory/${data.existingItem.id}`);
        return;
      }

      const params = new URLSearchParams({ barcode: code });
      if (data.suggestion?.name) params.set("name", data.suggestion.name);
      if (data.suggestion?.imageUrl) params.set("imageUrl", data.suggestion.imageUrl);
      router.push(`/inventory/new?${params.toString()}`);
    } finally {
      lookingRef.current = false;
      setLooking(false);
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.trim();
    if (code) handleCode(code);
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card overflow-hidden">
        <div id={SCANNER_ID} className="aspect-video w-full bg-black" />
      </div>

      {looking && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" /> Looking up barcode…
        </p>
      )}

      {cameraError && <p className="text-center text-sm text-[var(--danger)]">{cameraError}</p>}

      <div className="card p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <ScanLine size={15} /> Enter barcode manually
        </p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            className="input"
            placeholder="e.g. 0123456789012"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0">
            Look up
          </button>
        </form>
      </div>
    </div>
  );
}

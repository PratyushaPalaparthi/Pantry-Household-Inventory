import { AlertCircle } from "lucide-react";

/**
 * Inline form error. Uses role="alert" so it's announced by screen readers, and
 * a filled box rather than a bare line of small red text — an auth failure that
 * leaves you on the same page is easy to miss otherwise.
 */
export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border p-3 text-sm"
      style={{
        borderColor: "color-mix(in srgb, var(--danger) 45%, transparent)",
        background: "color-mix(in srgb, var(--danger) 12%, transparent)",
        color: "var(--danger)",
      }}
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

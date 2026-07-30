/** A stored upload filename: uuid-ish name plus extension, nothing path-like. */
const STORED_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/**
 * Extracts the bare filename from one of this app's own "/api/files/<name>"
 * URLs, returning null for anything else.
 *
 * Components hold this filename rather than a URL and rebuild the `src` from a
 * literal template (`/api/files/${name}`), so no free-form URL string is ever
 * kept in state and handed to the DOM — only a name that matched
 * STORED_FILENAME, which admits no scheme, slash, "..", or whitespace.
 *
 * This exists because /inventory/new accepts an `imageUrl` query parameter, so
 * without it a crafted link could put an arbitrary URL into the page: loading a
 * remote image leaks the viewer's IP to whoever sent the link and lets the page
 * be dressed up with attacker-chosen content. Callers that can also verify
 * ownership should do so — see src/app/inventory/new/page.tsx.
 */
export function storedImageName(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/api/files/")) return null;

  const name = trimmed.slice("/api/files/".length);
  if (name.includes("..") || name.includes("/") || !STORED_FILENAME.test(name)) return null;

  return name;
}

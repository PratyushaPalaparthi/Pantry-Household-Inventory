import stringSimilarity from "string-similarity";

export interface FuzzyMatch<T> {
  item: T;
  score: number;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9%]+/)
    .filter(Boolean);
}

/**
 * Dice's coefficient alone penalizes a short query against a long label:
 * "milk" scores only 0.375 against "2% Milk, 1 Gallon", below any useful
 * threshold. When every word of the query also appears in the label, treat
 * that as a strong match regardless of the length difference.
 */
function containmentScore(query: string, label: string): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;
  const labelTokens = tokenize(label);

  const matched = queryTokens.filter((queryToken) =>
    labelTokens.some((labelToken) =>
      // Very short tokens ("2", "oz") must match exactly, or they'd match
      // almost anything by prefix.
      queryToken.length < 3
        ? labelToken === queryToken
        : labelToken.startsWith(queryToken) || queryToken.startsWith(labelToken)
    )
  ).length;

  // Capped just below 1 so a true exact match always outranks containment.
  return (matched / queryTokens.length) * 0.95;
}

/**
 * Finds the best match for `query` among `candidates`, scoring each on the
 * higher of Dice's coefficient and word-containment. Returns null if nothing
 * clears `threshold`.
 */
export function findBestMatch<T>(
  query: string,
  candidates: T[],
  getLabel: (item: T) => string,
  threshold = 0.4
): FuzzyMatch<T> | null {
  if (candidates.length === 0) return null;

  const normalizedQuery = query.toLowerCase();
  let best: FuzzyMatch<T> | null = null;

  for (const candidate of candidates) {
    const label = getLabel(candidate);
    const score = Math.max(
      stringSimilarity.compareTwoStrings(normalizedQuery, label.toLowerCase()),
      containmentScore(query, label)
    );
    if (!best || score > best.score) best = { item: candidate, score };
  }

  if (!best || best.score < threshold) return null;
  return best;
}

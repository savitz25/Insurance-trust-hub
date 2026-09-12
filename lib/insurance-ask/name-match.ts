const GENERIC = new Set([
  "insurance",
  "ins",
  "agency",
  "agencies",
  "company",
  "co",
  "corporation",
  "corp",
  "inc",
  "llc",
  "llp",
  "limited",
  "ltd",
  "services",
  "group",
  "the",
  "and",
  "of",
]);
export function normalizeSourceName(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function distinctiveNameTokens(value: string): string[] {
  return [
    ...new Set(
      normalizeSourceName(value)
        .split(" ")
        .filter((t) => t.length > 1 && !GENERIC.has(t)),
    ),
  ];
}
export function escapeNamePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
export function matchSourceName(
  requested: string,
  value: string,
): { method: string; normalization: string[] } | null {
  const a = normalizeSourceName(requested),
    b = normalizeSourceName(value),
    tokens = distinctiveNameTokens(requested);
  if (!tokens.length || !b) return null;
  if (a === b)
    return {
      method: "normalized_exact_name",
      normalization: [
        "case, whitespace, punctuation and ampersand presentation only; legal suffixes retained",
      ],
    };
  const words = new Set(b.split(" "));
  return tokens.every((t) => words.has(t))
    ? {
        method: "distinctive_token_candidate",
        normalization: [
          "All distinctive requested tokens present; shorter/source name is a candidate, not exact identity.",
        ],
      }
    : null;
}

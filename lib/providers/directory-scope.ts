/** Recorded public-directory address only. Never a credential or service-area predicate. */
export function applyDirectoryZipScope<
  T extends { eq: (field: string, value: string) => T },
>(query: T, zip: string): T {
  if (!/^\d{5}$/.test(zip)) throw new Error("Invalid directory ZIP");
  return query.eq("contact->address->>zip", zip);
}

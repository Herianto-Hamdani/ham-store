export const SEARCH_QUERY_MIN_LENGTH = 2;
export const SEARCH_QUERY_MAX_LENGTH = 80;

const EXACT_PRODUCT_CODE_PATTERN = /^[A-Z0-9]+-(\d{4})-(\d+)$/;

export function normalizeSearchInput(value?: string | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, SEARCH_QUERY_MAX_LENGTH);
}

export function tokenizeSearchTerms(value: string): string[] {
  return (
    normalizeSearchInput(value)
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length > 0) ?? []
  );
}

export function isExactProductCodeQuery(value: string): boolean {
  return EXACT_PRODUCT_CODE_PATTERN.test(normalizeSearchInput(value).toUpperCase());
}

export function extractProductCodeId(value: string): number | null {
  const match = normalizeSearchInput(value).toUpperCase().match(EXACT_PRODUCT_CODE_PATTERN);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[2], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeTypeId(value: number | string | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeSearchPage(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
  }

  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function buildSearchRequestKey(search: string, typeId: number | null, page: number): string {
  const query = normalizeSearchInput(search).toLowerCase();
  const typeKey = typeId && typeId > 0 ? String(typeId) : "0";
  const pageKey = String(normalizeSearchPage(page));
  return `${query}::${typeKey}::${pageKey}`;
}

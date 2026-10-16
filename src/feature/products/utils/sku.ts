/**
 * SKU generation for product variants.
 *
 * Variants are the only records that carry a SKU, so a SKU always identifies a
 * product *and* one of its option combinations. The convention mirrors the
 * seeded catalogue:
 *
 *   with attribute values     AMERICANO-HOT-12OZ
 *   without attribute values  BISCOFF-SMORE-S-REGULAR
 *
 * The order of the attribute tokens is decided by the caller (see
 * `sortAttributeLabels`), so `Temperature` is written before `Size` exactly as
 * the seed data does.
 */

/** Matches `SkuSchema` on the server (`basta-kape-server/src/feature/product/product.types.ts`). */
export const SKU_MAX_LENGTH = 50;

/**
 * Reduce arbitrary text to an uppercase, hyphen-separated SKU token:
 * `"Biscoff Smore's"` -> `BISCOFF-SMORE-S`, `"12oz"` -> `12OZ`.
 */
export function toSkuToken(value: string | null | undefined): string {
    return String(value ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toUpperCase();
}

/**
 * Join a base and a suffix without ever exceeding `SKU_MAX_LENGTH`.
 * The suffix is kept intact and the descriptive base is trimmed instead, since
 * the suffix is what makes the SKU unique.
 */
function appendSuffix(base: string, suffix: string): string {
    const budget = Math.max(1, SKU_MAX_LENGTH - suffix.length);
    const trimmed = base.slice(0, budget).replace(/-+$/, '');
    return `${trimmed}${suffix}`;
}

/**
 * Build the natural SKU for one variant: the product name followed by each of
 * its attribute values. Products with no options fall back to `-REGULAR`, which
 * is how the seeded food and single-size drinks are named.
 */
export function buildSkuBase(productName: string, attributeValueLabels: string[] = []): string {
    const nameToken = toSkuToken(productName) || 'ITEM';
    const labelTokens = attributeValueLabels.map(toSkuToken).filter(Boolean);
    const suffix = labelTokens.length > 0 ? `-${labelTokens.join('-')}` : '-REGULAR';
    return appendSuffix(nameToken, suffix);
}

/**
 * The first free SKU at or after `base`, appending `-2`, `-3`, … when the
 * natural value is already taken.
 */
export function uniqueSku(base: string, taken: ReadonlySet<string>): string {
    if (!taken.has(base)) return base;
    for (let n = 2; n <= 999; n++) {
        const candidate = appendSuffix(base, `-${n}`);
        if (!taken.has(candidate)) return candidate;
    }
    return appendSuffix(base, `-${Date.now().toString(36).toUpperCase()}`);
}

export interface SkuAssignable {
    sku?: string | null;
    attributeValueLabels: string[];
}

/**
 * Fill in the SKUs that are missing and leave every existing SKU untouched.
 *
 * SKUs already present are reserved before anything is generated, so a
 * generated value can never duplicate — or displace — one that already exists
 * on the form. This is what makes the helper safe to run on every render.
 */
export function withGeneratedSkus<T extends SkuAssignable>(productName: string, rows: T[]): T[] {
    const taken = new Set(rows.map((row) => (row.sku ?? '').trim()).filter(Boolean));

    const next = rows.map((row) => {
        const existing = (row.sku ?? '').trim();
        if (existing) return row;
        const sku = uniqueSku(buildSkuBase(productName, row.attributeValueLabels), taken);
        taken.add(sku);
        return { ...row, sku };
    });

    // Returning the original array when nothing changed keeps React memoisation
    // and the edit page's duplicate detection cheap.
    return next.some((row, i) => row !== rows[i]) ? next : rows;
}

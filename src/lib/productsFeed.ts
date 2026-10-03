import { SITE, type Product } from "./store";

/** Fields read off the live feed — every other detail is optional. */
type FeedItem = {
  id?: string | number;
  name?: string;
  sku?: string | number;
  category?: string;
  price?: string | number;
  image?: string;
  url?: string;
  created?: string;
  summary?: string;
  description?: string;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

const formatPrice = (price: string | number | undefined) => {
  if (typeof price === "number") {
    return `${price.toLocaleString("en-US")} credits`;
  }
  return typeof price === "string" ? price.trim() : "";
};

/** Maps one feed row onto the tile shape; null when unusable. */
const toProduct = (raw: unknown, index: number): Product | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const item = raw as FeedItem;
  const name = typeof item.name === "string" ? item.name.trim() : "";
  if (!name) return null;
  const id =
    item.id !== undefined && String(item.id).trim() !== ""
      ? String(item.id).trim()
      : slugify(name) || `item-${index + 1}`;
  return {
    id,
    name,
    sku: String(item.sku ?? ""),
    category: String(item.category ?? ""),
    price: formatPrice(item.price),
    released: typeof item.created === "string" ? item.created : "",
    summary: String(item.summary ?? ""),
    description: String(item.description ?? item.summary ?? ""),
    image: String(item.image ?? ""),
    url: String(item.url ?? SITE.storeUrl),
  };
};

/** Sort key for "latest first"; unparsable dates sink to the bottom. */
const releasedTime = (value: string) => {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * Maps raw feed rows onto catalog products — newest first, at most 4 —
 * shared by the browser fetch path and the Convex IMVU feed action.
 */
export const normalizeFeedRows = (data: unknown): Product[] => {
  if (!Array.isArray(data)) return [];
  return (data as unknown[])
    .map(toProduct)
    .filter((item): item is Product => item !== null)
    .sort((a, b) => releasedTime(b.released) - releasedTime(a.released))
    .slice(0, 4);
};

/**
 * Latest products from a JSON feed endpoint. Returns [] when the endpoint
 * is missing, unreachable or answers with junk, so callers can keep the
 * built-in catalog instead of rendering an empty section.
 */
export async function fetchLatestProducts(
  endpoint: string,
): Promise<Product[]> {
  if (!endpoint) return [];
  try {
    const response = await fetch(endpoint);
    if (!response.ok) return [];
    return normalizeFeedRows((await response.json()) as unknown);
  } catch {
    return []; // offline or unreachable endpoint
  }
}

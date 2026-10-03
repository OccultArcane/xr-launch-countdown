import { action } from "./_generated/server";
import {
  imvuShopUrl,
  parseImvuShopPage,
  parseProductCategory,
} from "../lib/imvuShopPage";
import { normalizeFeedRows } from "../lib/productsFeed";
import type { Product } from "../lib/store";

/**
 * IMVU manufacturer id for the store the tiles pull from. IMVU has no
 * public name lookup — the id is resolved once from any product link
 * (`/shop/product.php?products_id=…` → the "by …" creator link, which
 * carries `manufacturers_id=<id>`).
 */
const MANUFACTURERS_ID = "106440837";

/** Browser UA — IMVU refuses default bot agents. */
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/**
 * The shop listing carries no product type, so each tile's product page
 * is read for its breadcrumb category ("Hair", "Accessories", …).
 * Failures leave "" rather than dropping the product.
 */
const fetchCategory = async (productId: string): Promise<string> => {
  try {
    const response = await fetch(
      `https://www.imvu.com/shop/product.php?products_id=${productId}`,
      { headers: { "user-agent": UA } },
    );
    if (!response.ok) return "";
    return parseProductCategory(await response.text());
  } catch {
    return "";
  }
};

export const latest = action({
  args: {},
  handler: async (): Promise<Product[]> => {
    if (!MANUFACTURERS_ID) return []; // not configured — catalog fallback
    try {
      const response = await fetch(imvuShopUrl(MANUFACTURERS_ID), {
        headers: { "user-agent": UA },
      });
      if (!response.ok) return [];
      // Only the tiles' first four rows are shown — fetch just those.
      const rows = parseImvuShopPage(await response.text()).slice(0, 4);
      const enriched = await Promise.all(
        rows.map(async (row) => ({
          ...row,
          category: await fetchCategory(row.id),
        })),
      );
      return normalizeFeedRows(enriched);
    } catch {
      return []; // network failure — keep the built-in catalog
    }
  },
});

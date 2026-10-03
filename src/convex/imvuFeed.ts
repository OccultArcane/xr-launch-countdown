import { action } from "./_generated/server";
import { imvuShopUrl, parseImvuShopPage } from "../lib/imvuShopPage";
import { normalizeFeedRows } from "../lib/productsFeed";
import type { Product } from "../lib/store";

/**
 * IMVU manufacturer id for the store the tiles pull from. IMVU has no
 * public name lookup — the id is resolved once from any product link
 * (`/shop/product.php?products_id=…` → the "by …" creator link, which
 * carries `manufacturers_id=<id>`).
 */
const MANUFACTURERS_ID = "106440837";

export const latest = action({
  args: {},
  handler: async (): Promise<Product[]> => {
    if (!MANUFACTURERS_ID) return []; // not configured — catalog fallback
    try {
      const response = await fetch(imvuShopUrl(MANUFACTURERS_ID), {
        headers: {
          "user-agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        },
      });
      if (!response.ok) return [];
      return normalizeFeedRows(parseImvuShopPage(await response.text()));
    } catch {
      return []; // network failure — keep the built-in catalog
    }
  },
});

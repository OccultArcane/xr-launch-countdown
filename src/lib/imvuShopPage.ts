/**
 * Parser for IMVU's server-rendered shop listings
 * (`/shop/web_search.php?manufacturers_id=…&sort=id&sortorder=desc`).
 * The listing already returns products newest-first (product IDs grow
 * over time), and each `widget-product-wide` card carries the id, name,
 * credit price and image URL we need for the tiles.
 */

export type ShopRow = {
  id: string;
  name: string;
  price: number | "";
  image: string;
  url: string;
  created: string;
};

/** Newest-first listing URL for a creator (IMVU "manufacturer"). */
export const imvuShopUrl = (manufacturersId: string) =>
  `https://www.imvu.com/shop/web_search.php?manufacturers_id=` +
  `${manufacturersId}&sort=id&sortorder=desc`;

const decodeEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

/**
 * Extracts the product cards from a shop listing page. Rows come back in
 * document order (newest first); duplicates are dropped because the page
 * repeats each product in its thumbnail, title and button links.
 */
export function parseImvuShopPage(html: string): ShopRow[] {
  const cards = html.split('<div class="widget-product-wide').slice(1);
  const rows: ShopRow[] = [];
  const seen = new Set<string>();

  for (const card of cards) {
    const id =
      card.match(/id="(\d+)"/)?.[1] ?? card.match(/products_id=(\d+)/)?.[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const name = card.match(/title="([^"]*)" class="thumbnail-link"/)?.[1];
    if (!name) continue;

    const image = card.match(/<img src="([^"]+)" class="thumbnail"/)?.[1] ?? "";
    const priceText = card.match(
      /class="price"><span class=['"]notranslate['"]>([\d,.]+)</,
    )?.[1];
    const price = priceText ? Number(priceText.replace(/[,.]/g, "")) : "";

    rows.push({
      id,
      name: decodeEntities(name),
      price: Number.isFinite(price as number) ? (price as number) : "",
      image,
      url: `https://www.imvu.com/shop/product.php?products_id=${id}`,
      created: "",
    });
  }

  return rows;
}

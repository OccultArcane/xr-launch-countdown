/**
 * Refreshes the storefront's product feed from the creator's live IMVU shop.
 *
 * The landing page's four tiles come from public/products.json, which this
 * writes: item id, name, credit price, breadcrumb category, thumbnail URL and
 * the link into the shop. Re-run it (`npm run refresh-products`) whenever a
 * drop lands, and commit the result — the tiles, their artwork and the product
 * links then follow the shop with no backend involved, which is what lets the
 * storefront run as a plain static site.
 *
 * The listing parse is the app's own (src/lib/imvuShopPage.ts) — type-stripped
 * with esbuild, which Vite already ships, and imported — so there is exactly
 * one implementation of it.
 */
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

/** IMVU manufacturer id of the store the tiles show. */
const MANUFACTURERS_ID = "106440837";
/** How many tiles the section shows. */
const LIMIT = 4;
/** IMVU refuses default bot agents. */
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

let transform;
try {
  ({ transform } = await import("esbuild"));
} catch {
  console.error(
    "esbuild is missing — run `npm install` first (it ships with Vite).",
  );
  process.exit(1);
}

const parserSource = await readFile(
  new URL("src/lib/imvuShopPage.ts", root),
  "utf8",
);
const { code } = await transform(parserSource, { loader: "ts", format: "esm" });
const { imvuShopUrl, parseImvuShopPage, parseProductCategory } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

const get = (url) => fetch(url, { headers: { "user-agent": UA } });
const listingUrl = imvuShopUrl(MANUFACTURERS_ID);

const listing = await get(listingUrl);
if (!listing.ok) {
  console.error(`shop listing answered HTTP ${listing.status} — ${listingUrl}`);
  process.exit(1);
}

const rows = parseImvuShopPage(await listing.text()).slice(0, LIMIT);
if (rows.length === 0) {
  console.error(
    "the shop listing parsed to zero products — IMVU's markup may have changed",
  );
  process.exit(1);
}

const items = [];
for (const row of rows) {
  const page = await get(
    `https://www.imvu.com/shop/product.php?products_id=${row.id}`,
  );
  // A tile must never ship an image URL that does not resolve.
  const thumb = await get(row.image).catch(() => null);
  if (!row.image || !thumb?.ok) {
    console.warn(`  no thumbnail for ${row.id} — the tile will render without one`);
  }
  items.push({
    id: row.id,
    name: row.name,
    price: row.price,
    category: page.ok ? parseProductCategory(await page.text()) : "",
    image: row.image && thumb?.ok ? row.image : "",
    url: row.url,
  });
  console.log(
    `  ${row.id}  ${row.name}  ${row.price ?? "?"} credits` +
      `${items[items.length - 1].category ? "  " + items[items.length - 1].category : ""}`,
  );
}

// A bare array: that is the shape the browser feed and the Convex action
// both hand to normalizeFeedRows.
await writeFile(
  new URL("public/products.json", root),
  `${JSON.stringify(items, null, 2)}\n`,
);
console.log(`wrote public/products.json — ${items.length} items`);

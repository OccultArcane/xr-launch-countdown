/* ────────────────────────────────────────────────────────────────────
   xr storefront — configuration

   Edit this file to:
     1. change the mark (text, or a logo image used as a mask)
     2. add your IMVU products and store links

   IMVU product links look like:
     https://www.imvu.com/shop/product/12345678/
   ──────────────────────────────────────────────────────────────────── */

import { asset } from "./asset";

export const SITE = {
  /** Brand shown in the header and footer. */
  name: "xr",
  /** What the binary mark spells — the centred blackletter "xr" pair. */
  maskText: "xr",
  /**
   * Logo used as the mask for the binary mark when no font mask loads.
   * Save your artwork into /public (e.g. "xr-mask.png" — transparent PNG
   * or shape on a flat background) and point this at it; leave "" to fall
   * back to maskText.
   */
  maskImage: asset("xr-mask.png"),
  /**
   * Stand-in silhouette used until a font or logo mask exists, so the
   * mark always masks to a styled xr shape (currently a drawn
   * thorned/dripping blackletter set in the Midnight Grave style).
   */
  maskImageFallback: asset("xr-mask-fallback.svg"),
  /**
   * Display font the binary mask is drawn in — UnifrakturCook, a bold
   * blackletter free under the SIL OFL (licence text ships as
   * /public/UNIFRAKTURCOOK-OFL.txt). The mask is the letterforms "xr"
   * set in this face; tried first, falling through to maskImage, then
   * maskImageFallback if the file is missing or unreadable. Leave "" for
   * no font mask.
   */
  maskFontFile: asset("unifrakturcook-bold.ttf"),
  /**
   * JSON feed for the "new products" section (array of { id, name, price,
   * image, url, category }), fetched straight from the browser. It points at
   * public/products.json — the snapshot `npm run refresh-products` writes
   * from the creator's live IMVU shop — so the tiles carry real items and
   * their artwork on any static host, with no backend to run.
   *
   * Set it to "" to fall back to the Convex action that scrapes the shop
   * server-side (src/convex/imvuFeed.ts, needs a deployment); with no feed
   * at all the tiles keep the PRODUCTS catalog below.
   */
  productsApi: asset("products.json"),
  /**
   * Your IMVU store URL — the creator's own shop listing (the same
   * manufacturer id the live feed scrapes), used as the fallback link on
   * a product page and on any tile whose item has no direct URL.
   */
  storeUrl:
    "https://www.imvu.com/shop/web_search.php?manufacturers_id=106440837",
};

export type Product = {
  /** URL slug for the detail page: /products/<id> */
  id: string;
  name: string;
  sku: string;
  category: string;
  price: string;
  released: string;
  summary: string;
  description: string;
  /** Optional preview image (file in /public). "" shows no image. */
  image: string;
  /** Direct link to the item in your IMVU store. */
  url: string;
};

/**
 * The built-in catalog: the creator's four newest items, read straight off
 * the IMVU shop listing (id, name, credit price and breadcrumb category),
 * newest first. The tile titles carry the studio's `𝕩𝕣` mark — the same
 * high-plane glyphs IMVU returns — so they must not be normalised to "xr".
 *
 * Each `id` is the item's real IMVU product id, which is also its SKU and
 * what `url` points at, so a tile (and the detail page behind it) always
 * lands on the live item instead of a dead placeholder link. `image` is the
 * same thumbnail URL the feed hands out, hotlinked from IMVU's CDN, so the
 * tiles carry their artwork even when the live feed is unavailable.
 *
 * The live feed (src/convex/imvuFeed.ts) replaces this list whenever the
 * creator's shop is reachable — and the shop listing is newest-first, so
 * whatever it returns belongs in this same position. `released` is the
 * date the listing was last read by hand (2026-10-03), which is the floor
 * for "newest", not a per-item publication date.
 */
export const PRODUCTS: Product[] = [
  {
    id: "76161696",
    name: "𝕩𝕣 grace poster",
    sku: "76161696",
    category: "Floor & Wall Decor",
    price: "770 credits",
    released: "2026-10-03",
    summary: "Portrait poster from the studio's navi series.",
    description:
      "A full-colour portrait poster from the navi series, sold as a single wall item so it hangs as one piece.",
    image:
      "https://userimages01-akm.imvu.com/productdata/images_ca7f0dc081c3a2969e11252417b66256.png",
    url: "https://www.imvu.com/shop/product.php?products_id=76161696",
  },
  {
    id: "76152725",
    name: "𝕩𝕣 claire poster",
    sku: "76152725",
    category: "Floor & Wall Decor",
    price: "770 credits",
    released: "2026-10-03",
    summary: "Portrait poster from the studio's navi series.",
    description:
      "A full-colour portrait poster from the navi series, sold as a single wall item so it hangs as one piece.",
    image:
      "https://userimages05-akm.imvu.com/productdata/images_946700b088f63071e004f329153d18cc.png",
    url: "https://www.imvu.com/shop/product.php?products_id=76152725",
  },
  {
    id: "76152664",
    name: "𝕩𝕣 carlos poster",
    sku: "76152664",
    category: "Floor & Wall Decor",
    price: "770 credits",
    released: "2026-10-03",
    summary: "Portrait poster from the studio's navi series.",
    description:
      "A full-colour portrait poster from the navi series, sold as a single wall item so it hangs as one piece.",
    // Same artwork as the luise poster — the studio published one image
    // for both, so the tiles match the shop listing.
    image:
      "https://userimages01-akm.imvu.com/productdata/images_faf4ce6a30e7851efddcf14f77005789.png",
    url: "https://www.imvu.com/shop/product.php?products_id=76152664",
  },
  {
    id: "76152645",
    name: "𝕩𝕣 luise poster",
    sku: "76152645",
    category: "Floor & Wall Decor",
    price: "770 credits",
    released: "2026-10-03",
    summary: "Portrait poster from the studio's navi series.",
    description:
      "A full-colour portrait poster from the navi series, sold as a single wall item so it hangs as one piece.",
    image:
      "https://userimages01-akm.imvu.com/productdata/images_faf4ce6a30e7851efddcf14f77005789.png",
    url: "https://www.imvu.com/shop/product.php?products_id=76152645",
  },
];

export const getProduct = (id?: string) =>
  PRODUCTS.find((product) => product.id === id);

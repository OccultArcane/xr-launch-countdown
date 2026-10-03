/* ────────────────────────────────────────────────────────────────────
   xr storefront — configuration

   Edit this file to:
     1. change the mark (text, or a logo image used as a mask)
     2. add your IMVU products and store links

   IMVU product links look like:
     https://www.imvu.com/shop/product/12345678/
   ──────────────────────────────────────────────────────────────────── */

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
  maskImage: "/xr-mask.png",
  /**
   * Stand-in silhouette used until a font or logo mask exists, so the
   * mark always masks to a styled xr shape (currently a drawn
   * thorned/dripping blackletter set in the Midnight Grave style).
   */
  maskImageFallback: "/xr-mask-fallback.svg",
  /**
   * Display font the binary mask is drawn in — UnifrakturCook, a bold
   * blackletter free under the SIL OFL (licence text ships as
   * /public/UNIFRAKTURCOOK-OFL.txt). The mask is the letterforms "xr"
   * set in this face; tried first, falling through to maskImage, then
   * maskImageFallback if the file is missing or unreadable. Leave "" for
   * no font mask.
   */
  maskFontFile: "/unifrakturcook-bold.ttf",
  /**
   * Live feed for the "new products" section: the 4 most recently created
   * items fill the tiles automatically (expects an array of { name, price,
   * image, url, created }). Replace the placeholder with your real IMVU
   * creator endpoint — the section keeps the PRODUCTS catalog below while
   * the endpoint is missing or unreachable.
   */
  productsApi: "https://api.example.com/imvu/creator/xr/products",
  /** Your IMVU store URL — used as the fallback link on a product page. */
  storeUrl: "https://www.imvu.com/store/",
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

export const PRODUCTS: Product[] = [
  {
    id: "noir-grid-set",
    name: "Noir Grid Set",
    sku: "XR-001",
    category: "outfit",
    price: "1,450 credits",
    released: "2026-10-02",
    summary: "A tailored two-piece set with a fine grid weave.",
    description:
      "A fitted jacket and trouser pair cut close to the avatar and finished with a fine grid weave that stays crisp at any distance. Delivered as one catalogued item, ready to wear.",
    image: "",
    url: "https://www.imvu.com/shop/product/00000000/",
  },
  {
    id: "signal-visor",
    name: "Signal Visor",
    sku: "XR-002",
    category: "accessory",
    price: "820 credits",
    released: "2026-10-02",
    summary: "A low-profile visor with a dimmed technical readout.",
    description:
      "A slim wraparound visor with a dimmed readout layer — visible enough to read as hardware, quiet enough to keep the face in focus. Sits cleanly over most hairstyles.",
    image: "",
    url: "https://www.imvu.com/shop/product/00000000/",
  },
  {
    id: "static-halo-hair",
    name: "Static Halo Hair",
    sku: "XR-003",
    category: "hair",
    price: "990 credits",
    released: "2026-09-24",
    summary: "A sharp mid-length cut with a soft, static-frayed edge.",
    description:
      "A mid-length cut with a sharp centre part and a lightly frayed edge, built to hold its shape in motion. Supplied in the full natural colour range.",
    image: "",
    url: "https://www.imvu.com/shop/product/00000000/",
  },
  {
    id: "terminal-room",
    name: "Terminal Room",
    sku: "XR-004",
    category: "scene",
    price: "2,300 credits",
    released: "2026-09-18",
    summary: "A darkened room built around one glowing terminal wall.",
    description:
      "A low-lit room scene with a single glowing terminal wall, matte floor panels, and enough negative space to keep avatars the subject. Includes posed and unposed states.",
    image: "",
    url: "https://www.imvu.com/shop/product/00000000/",
  },
];

export const getProduct = (id?: string) =>
  PRODUCTS.find((product) => product.id === id);

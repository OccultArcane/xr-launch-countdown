import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAction } from "convex/react";
import { motion } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { categoryGroup } from "@/lib/category";
import { hasConvex } from "@/lib/convex";
import { fetchLatestProducts } from "@/lib/productsFeed";
import { PRODUCTS, SITE, type Product } from "@/lib/store";

/* The link is the hit area, so it holds the width and never moves. The
   width follows the window's height instead of stepping at a few fixed
   breakpoints, so the catalog scales with the page continuously and the
   storefront keeps filling the screen at any size. */
const TILE_CLASS =
  "group relative flex w-[clamp(96px,13vmin,220px)] flex-col outline-none";

/* Everything visible — frame, artwork, price — bumps inside it. */
const TILE_FRAME_CLASS =
  "viewfinder flex flex-1 flex-col bg-[#0a0a0a] p-[clamp(0.5rem,1.4vmin,1rem)] transition-[transform,background-color] duration-150 group-hover:bg-white/[0.03] group-focus-visible:bg-white/[0.03]";

function Tile({
  product,
  nudge = "left",
}: {
  product: Product;
  /** Which way the tile bumps on hover: away from the mark's centre. */
  nudge?: "left" | "right";
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-1 text-[clamp(8px,1vmin,11px)] uppercase tracking-[0.25em]">
        <span className="flex items-center gap-1.5 text-neutral-300">
          <span
            className="blink-dot h-1.5 w-1.5 rounded-full bg-xr-red"
            aria-hidden="true"
          />
          new
        </span>
        {/* The feed's breadcrumb folded onto a shelf — "Floor & Wall
            Decor" reads `decor` here, so the tags group instead of each
            spelling claiming its own line. */}
        <span className="truncate text-neutral-500">
          {categoryGroup(product.category)}
        </span>
      </div>

      {/* Image — full tile width at its natural height, never cropped */}
      {product.image && (
        <div className="mt-[clamp(0.375rem,1.2vmin,0.75rem)]">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="block h-auto w-full"
            onError={(event) => {
              // Thumbnails are hotlinked from IMVU's CDN (the feed's own
              // host); if one ever stops resolving, drop the slot rather
              // than leave a broken-image glyph inside the tile.
              const slot = event.currentTarget.parentElement;
              if (slot) slot.style.display = "none";
            }}
          />
        </div>
      )}

      {/* Name and price are centred under the artwork — the whole tile is
          the link, so no arrow is needed to say it opens something. */}
      <div className="mt-auto min-w-0 text-center">
        <h3 className="text-[clamp(11px,1.2vmin,14px)] leading-snug tracking-wide text-neutral-100 transition-colors group-hover:text-white">
          {product.name}
        </h3>
      </div>

      <div className="mt-[clamp(0.375rem,1vmin,0.625rem)] flex items-center justify-center border-t border-white/10 pt-[clamp(0.25rem,0.8vmin,0.5rem)] text-center">
        <span className="min-w-0 truncate text-[clamp(10px,1.05vmin,13px)] tabular-nums text-neutral-300">
          {product.price}
        </span>
      </div>
    </>
  );

  // Every tile opens the item's own page on IMVU in a new tab, so a click
  // lands on the shop listing the visitor can actually buy from.
  //
  // The link box is the hit area and stays exactly where the stack puts it;
  // the frame inside is what moves. Sliding the link itself pulled its edge
  // out from under a cursor resting on that borderline, which dropped the
  // hover, slid the link back under the cursor, and repeated.
  return (
    <a
      href={product.url || SITE.storeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={TILE_CLASS}
    >
      <span
        className={
          TILE_FRAME_CLASS +
          (nudge === "right"
            ? " group-hover:translate-x-1"
            : " group-hover:-translate-x-1")
        }
      >
        {body}
      </span>
    </a>
  );
}

function Stack({
  items,
  className,
  nudge,
}: {
  items: Product[];
  className: string;
  nudge?: "left" | "right";
}) {
  return (
    <div
      className={
        "grid shrink-0 grid-cols-1 gap-[clamp(0.375rem,1.1vmin,0.75rem)] " +
        className
      }
    >
      {items.map((product) => (
        <Tile key={product.id} product={product} nudge={nudge} />
      ))}
    </div>
  );
}

/**
 * The live IMVU feed, mounted only when this build has a Convex deployment:
 * the hooks need a client behind them, and the built-in catalog already
 * stands in when there is none. Hands its result up to the section, which
 * keeps whichever list is usable.
 */
function ImvuFeed({ onProducts }: { onProducts: (items: Product[]) => void }) {
  const runImvuFeed = useAction(api.imvuFeed.latest);

  useEffect(() => {
    let cancelled = false;
    void runImvuFeed()
      .then((latest) => {
        if (!cancelled && latest.length > 0) onProducts(latest);
      })
      .catch((error: unknown) => {
        // A failure is logged so a silently-stale catalog can be
        // diagnosed — the built-in catalog stays on screen.
        console.error(
          "IMVU feed unavailable — keeping the built-in catalog",
          error,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [runImvuFeed, onProducts]);

  return null;
}

/**
 * The catalog beside the mark: square tiles stacked on top of each other —
 * a column on each side of the mark, or one full stack under it when the
 * container is too narrow for the row (breakpoints query the full-width
 * stage container, so the arrangement follows the space available).
 * The tiles fill from the live feed (latest 4 by creation date) and keep
 * the built-in catalog whenever the feed is unavailable; each one links
 * straight out to its item on IMVU.
 */
export function MarkWithProducts({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const applyFeed = useCallback((items: Product[]) => setProducts(items), []);

  // A URL in SITE.productsApi is fetched straight from the browser; with no
  // URL the Convex action scrapes the creator's IMVU shop server-side (see
  // ImvuFeed below). Either way, empty results leave the built-in catalog
  // in place, so the section is never empty.
  useEffect(() => {
    if (!SITE.productsApi) return;
    let cancelled = false;
    void fetchLatestProducts(SITE.productsApi).then((latest) => {
      if (!cancelled && latest.length > 0) applyFeed(latest);
    });
    return () => {
      cancelled = true;
    };
  }, [applyFeed]);

  // The live feed needs a deployment; without one the built-in catalog is
  // the feed.
  const feed = hasConvex && !SITE.productsApi && (
    <ImvuFeed onProducts={applyFeed} />
  );

  const mid = Math.ceil(products.length / 2);
  const left = products.slice(0, mid);
  const right = products.slice(mid);
  const hasProducts = products.length > 0;

  return (
    <motion.section
      id="products"
      aria-label="new products"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="flex w-full min-h-0 flex-1 flex-col scroll-m-24"
    >
      {feed}
      <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-[clamp(0.75rem,2.2vmin,2rem)] @lg:h-full @lg:flex-row @lg:items-center">
        {/* Left of the mark bumps left, right of it bumps right, so each
            side moves away from the centre. */}
        {hasProducts && (
          <Stack
            items={left}
            className="order-1 hidden @lg:grid"
            nudge="left"
          />
        )}

        {/* The mark: x's and r's assembling your logo silhouette. Beside the
            catalog it takes the row's full height, which the section has
            already stretched to whatever the header, footer, countdown and
            creator row leave — so the storefront fills the screen at any
            window size. Stacked above the catalog (below @lg) it keeps the
            viewport-based height instead, so it cannot be squeezed to
            nothing by four tiles underneath it. */}
        <div className="order-1 h-[clamp(270px,calc(100dvh_-_585px),560px)] w-full @lg:order-2 @lg:h-full @lg:min-h-[180px] @lg:w-auto @lg:flex-1">
          {children}
        </div>

        {hasProducts && (
          <div className="order-2 grid w-fit grid-cols-1 gap-[clamp(0.375rem,1.1vmin,0.75rem)] @lg:hidden">
            {products.map((product) => (
              <Tile key={product.id} product={product} />
            ))}
          </div>
        )}

        {hasProducts && (
          <Stack
            items={right}
            className="order-3 hidden @lg:grid"
            nudge="right"
          />
        )}
      </div>
    </motion.section>
  );
}

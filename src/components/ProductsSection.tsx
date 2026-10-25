import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAction } from "convex/react";
import { motion } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { hasConvex } from "@/lib/convex";
import { fetchLatestProducts } from "@/lib/productsFeed";
import { PRODUCTS, SITE, type Product } from "@/lib/store";

const TILE_CLASS =
  "viewfinder group flex w-[144px] flex-col bg-[#0a0a0a] p-3 outline-none transition-[transform,background-color] duration-150 hover:bg-white/[0.03] focus-visible:bg-white/[0.03] @sm:p-4 @xl:w-[156px] short:w-[124px] short:p-3 shorter:w-[108px] shorter:p-2.5";

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
      <div className="flex items-center justify-between gap-1 text-[8px] uppercase tracking-[0.25em] @sm:text-[9px]">
        <span className="flex items-center gap-1.5 text-neutral-300">
          <span
            className="blink-dot h-1.5 w-1.5 rounded-full bg-xr-red"
            aria-hidden="true"
          />
          new
        </span>
        <span className="truncate text-neutral-500">{product.category}</span>
      </div>

      {/* Image — full tile width at its natural height, never cropped */}
      {product.image && (
        <div className="mt-3">
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
        <h3 className="text-[11px] leading-snug tracking-wide text-neutral-100 transition-colors group-hover:text-white @sm:text-[12px]">
          {product.name}
        </h3>
      </div>

      <div className="mt-2.5 flex items-center justify-center border-t border-white/10 pt-2 text-center">
        <span className="min-w-0 truncate text-[10px] tabular-nums text-neutral-300">
          {product.price}
        </span>
      </div>
    </>
  );

  // Every tile opens the item's own page on IMVU in a new tab, so a click
  // lands on the shop listing the visitor can actually buy from.
  return (
    <a
      href={product.url || SITE.storeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={
        TILE_CLASS +
        (nudge === "right" ? " hover:translate-x-1" : " hover:-translate-x-1")
      }
    >
      {body}
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
        "grid shrink-0 grid-cols-1 gap-2.5 short:gap-2 shorter:gap-1.5 " +
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
      className="w-full scroll-m-24"
    >
      {feed}
      <div className="flex w-full flex-col items-center gap-8 @lg:flex-row @lg:items-center @lg:gap-6">
        {/* Left of the mark bumps left, right of it bumps right, so each
            side moves away from the centre. */}
        {hasProducts && (
          <Stack items={left} className="order-1 hidden @lg:grid" nudge="left" />
        )}

        {/* The mark: x's and r's assembling your logo silhouette. It takes
            whatever height the rest of the page leaves — the header, footer,
            countdown and the creator row account for roughly 585px, measured
            in a browser — so the storefront fills the screen instead of
            floating in it, capped so the mark never grows past the artwork's
            own size. The floor is where that budget runs out on a short
            laptop, and the `short:` steps above have already compacted the
            catalog and chrome by then. */}
        <div className="order-1 h-[clamp(270px,calc(100dvh_-_585px),560px)] w-full @lg:order-2 @lg:w-auto @lg:flex-1">
          {children}
        </div>

        {hasProducts && (
          <div className="order-2 grid w-fit grid-cols-1 gap-2.5 short:gap-2 @lg:hidden">
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

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useAction } from "convex/react";
import { motion } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { fetchLatestProducts } from "@/lib/productsFeed";
import { PRODUCTS, SITE, type Product } from "@/lib/store";

const TILE_CLASS =
  "glitch-hover group flex w-[144px] flex-col border border-white/10 bg-[#0a0a0a] p-3 outline-none transition-colors hover:bg-white/[0.03] focus-visible:bg-white/[0.03] @sm:p-4 @xl:w-[156px]";

function Tile({ product }: { product: Product }) {
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
          />
        </div>
      )}

      <div className="mt-auto min-w-0">
        <h3 className="text-[11px] leading-snug tracking-wide text-neutral-100 transition-colors group-hover:text-white @sm:text-[12px]">
          {product.name}
        </h3>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
        <span className="min-w-0 truncate text-[10px] tabular-nums text-neutral-300">
          {product.price}
        </span>
        <span className="shrink-0 text-[11px] text-neutral-500 transition-colors group-hover:text-neutral-200">
          →
        </span>
      </div>
    </>
  );

  // Catalog items open their detail page; live-feed items have no local
  // page, so they go straight to the IMVU store in a new tab.
  if (!PRODUCTS.some((item) => item.id === product.id)) {
    return (
      <a
        href={product.url || SITE.storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={TILE_CLASS}
      >
        {body}
      </a>
    );
  }

  return (
    <Link to={`/products/${product.id}`} className={TILE_CLASS}>
      {body}
    </Link>
  );
}

function Stack({ items, className }: { items: Product[]; className: string }) {
  return (
    <div className={"grid shrink-0 grid-cols-1 gap-2.5 " + className}>
      {items.map((product) => (
        <Tile key={product.id} product={product} />
      ))}
    </div>
  );
}

/**
 * The catalog beside the mark: square tiles stacked on top of each other —
 * a column on each side of the mark, or one full stack under it when the
 * container is too narrow for the row (breakpoints query the fixed-size
 * stage container, so every device shows the same arrangement).
 * The tiles fill from the live feed (latest 4 by creation date) and keep
 * the built-in catalog whenever the feed is unavailable.
 */
export function MarkWithProducts({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const runImvuFeed = useAction(api.imvuFeed.latest);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // A URL in SITE.productsApi is fetched directly; otherwise the
      // Convex action scrapes the creator's IMVU shop server-side. Either
      // way, empty results leave the built-in catalog in place — but a
      // failure is logged so a silently-stale catalog can be diagnosed.
      const latest = SITE.productsApi
        ? await fetchLatestProducts(SITE.productsApi)
        : await runImvuFeed().catch((error: unknown) => {
            console.error(
              "IMVU feed unavailable — keeping the built-in catalog",
              error,
            );
            return [] as Product[];
          });
      if (!cancelled && latest.length > 0) setProducts(latest);
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [runImvuFeed]);

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
      <div className="flex w-full flex-col items-center gap-8 @lg:flex-row @lg:items-center @lg:gap-6">
        {hasProducts && (
          <Stack items={left} className="order-1 hidden @lg:grid" />
        )}

        {/* The mark: x's and r's assembling your logo silhouette */}
        <div className="order-1 h-[440px] w-full @lg:order-2 @lg:w-auto @lg:flex-1">
          {children}
        </div>

        {hasProducts && (
          <div className="order-2 grid w-fit grid-cols-1 gap-2.5 @lg:hidden">
            {products.map((product) => (
              <Tile key={product.id} product={product} />
            ))}
          </div>
        )}

        {hasProducts && (
          <Stack items={right} className="order-3 hidden @lg:grid" />
        )}
      </div>
    </motion.section>
  );
}

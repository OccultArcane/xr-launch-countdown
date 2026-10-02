import type { ReactNode } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { PRODUCTS, type Product } from "@/lib/store";

function Tile({ product }: { product: Product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="glitch-hover group flex aspect-square w-[144px] flex-col border border-white/10 bg-[#0a0a0a] p-3 outline-none transition-colors hover:bg-white/[0.03] focus-visible:bg-white/[0.03] sm:p-4 xl:w-[156px]"
    >
      <div className="flex items-center justify-between gap-1 text-[8px] uppercase tracking-[0.25em] sm:text-[9px]">
        <span className="flex items-center gap-1.5 text-neutral-300">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[#f84848]"
            aria-hidden="true"
          />
          new
        </span>
        <span className="truncate text-neutral-500">{product.category}</span>
      </div>

      <div className="mt-auto min-w-0">
        <h3 className="text-[11px] leading-snug tracking-wide text-neutral-100 transition-colors group-hover:text-white sm:text-[12px]">
          {product.name}
        </h3>
        <p className="mt-1 text-[9px] tracking-[0.1em] text-neutral-500">
          {product.sku}
        </p>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
        <span className="min-w-0 truncate text-[10px] tabular-nums text-neutral-300">
          {product.price}
        </span>
        <span className="shrink-0 text-[11px] text-neutral-500 transition-colors group-hover:text-neutral-200">
          →
        </span>
      </div>
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
 * a column on each side on desktop, one full stack under it on mobile.
 */
export function MarkWithProducts({ children }: { children: ReactNode }) {
  const mid = Math.ceil(PRODUCTS.length / 2);
  const left = PRODUCTS.slice(0, mid);
  const right = PRODUCTS.slice(mid);
  const hasProducts = PRODUCTS.length > 0;

  return (
    <motion.section
      id="products"
      aria-label="new products"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="w-full scroll-m-24"
    >
      <div className="mb-6 flex items-baseline justify-between text-[10px] uppercase tracking-[0.35em] text-neutral-500">
        <span>new products</span>
        <span className="tabular-nums">
          {String(PRODUCTS.length).padStart(2, "0")} items
        </span>
      </div>

      <div className="flex w-full flex-col items-center gap-8 lg:flex-row lg:items-center lg:gap-6">
        {hasProducts && (
          <Stack items={left} className="order-1 hidden lg:grid" />
        )}

        {/* The mark: 0s and 1s assembling your logo silhouette */}
        <div className="order-1 h-[clamp(240px,42vh,440px)] w-full lg:order-2 lg:w-auto lg:flex-1">
          {children}
        </div>

        {hasProducts && (
          <div className="order-2 grid w-fit grid-cols-1 gap-2.5 lg:hidden">
            {PRODUCTS.map((product) => (
              <Tile key={product.id} product={product} />
            ))}
          </div>
        )}

        {hasProducts && (
          <Stack items={right} className="order-3 hidden lg:grid" />
        )}
      </div>
    </motion.section>
  );
}

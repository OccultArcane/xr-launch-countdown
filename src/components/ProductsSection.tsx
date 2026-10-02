import { Link } from "react-router";
import { motion } from "framer-motion";
import { PRODUCTS } from "@/lib/store";

/** Fillers keep the hairline grid closed at both breakpoints. */
function fillerCount(columns: number) {
  return (columns - (PRODUCTS.length % columns)) % columns;
}

/**
 * A horizontal row of equal square tiles; each tile opens the item's
 * detail page.
 */
export function ProductsSection() {
  const count = String(PRODUCTS.length).padStart(2, "0");
  const fillersMobile = fillerCount(2);
  const fillersDesktop = fillerCount(4);

  return (
    <motion.section
      id="products"
      aria-label="products"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
      className="w-full max-w-5xl scroll-m-24 border-t border-white/10 pt-10 sm:pt-12"
    >
      <div className="mb-6 flex items-baseline justify-between text-[10px] uppercase tracking-[0.35em] text-neutral-500">
        <span>new products</span>
        <span className="tabular-nums">{count} items</span>
      </div>

      <div className="grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-4">
        {PRODUCTS.map((product, index) => (
          <Link
            key={product.id}
            to={`/products/${product.id}`}
            className="group flex aspect-square flex-col bg-[#0a0a0a] p-4 outline-none transition-colors hover:bg-white/[0.03] focus-visible:bg-white/[0.03] sm:p-5"
          >
            <div className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.3em] text-neutral-500 sm:text-[10px]">
              <span className="tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="truncate">{product.category}</span>
            </div>

            <div className="mt-auto min-w-0">
              <h3 className="text-[13px] leading-snug tracking-wide text-neutral-100 transition-colors group-hover:text-white">
                {product.name}
              </h3>
              <p className="mt-1.5 text-[10px] tracking-[0.12em] text-neutral-500">
                {product.sku}
              </p>
            </div>

            <div className="mt-4 flex items-end justify-between gap-2 border-t border-white/10 pt-3">
              <span className="min-w-0 truncate text-[11px] tabular-nums text-neutral-300">
                {product.price}
              </span>
              <span className="shrink-0 text-[9px] uppercase tracking-[0.25em] text-neutral-500 transition-colors group-hover:text-neutral-200">
                open →
              </span>
            </div>
          </Link>
        ))}
        {Array.from({ length: fillersMobile }, (_, i) => (
          <div
            key={`filler-m-${i}`}
            className="aspect-square bg-[#0a0a0a]"
            aria-hidden="true"
          />
        ))}
        {Array.from(
          { length: Math.max(0, fillersDesktop - fillersMobile) },
          (_, i) => (
            <div
              key={`filler-d-${i}`}
              className="hidden aspect-square bg-[#0a0a0a] sm:block"
              aria-hidden="true"
            />
          ),
        )}
      </div>
    </motion.section>
  );
}

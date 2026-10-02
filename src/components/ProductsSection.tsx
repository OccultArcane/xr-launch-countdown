import { Link } from "react-router";
import { motion } from "framer-motion";
import { PRODUCTS } from "@/lib/store";

/**
 * Hairline grid of catalogued items; each card opens the item's detail page.
 */
export function ProductsSection() {
  const count = String(PRODUCTS.length).padStart(2, "0");
  const needsFiller = PRODUCTS.length % 2 === 1;

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

      <div className="grid grid-cols-1 gap-px border border-white/10 bg-white/10 sm:grid-cols-2">
        {PRODUCTS.map((product, index) => (
          <Link
            key={product.id}
            to={`/products/${product.id}`}
            className="group flex flex-col gap-5 bg-[#0a0a0a] p-5 outline-none transition-colors hover:bg-white/[0.03] focus-visible:bg-white/[0.03] sm:p-6"
          >
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-neutral-500">
              <span className="tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{product.category}</span>
            </div>

            <div>
              <h3 className="text-sm tracking-wide text-neutral-100 transition-colors group-hover:text-white">
                {product.name}
              </h3>
              <p className="mt-2 text-[11px] leading-relaxed tracking-[0.06em] text-neutral-500">
                {product.summary}
              </p>
            </div>

            <div className="mt-auto flex items-end justify-between">
              <span className="text-xs tabular-nums text-neutral-300">
                {product.price}
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 transition-colors group-hover:text-neutral-200">
                open →
              </span>
            </div>
          </Link>
        ))}
        {needsFiller && (
          <div className="hidden bg-[#0a0a0a] sm:block" aria-hidden="true" />
        )}
      </div>
    </motion.section>
  );
}

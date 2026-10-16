import { useEffect } from "react";
import { Link, useParams } from "react-router";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PRODUCTS, SITE, getProduct } from "@/lib/store";

export default function ProductDetail() {
  const { id } = useParams();
  const product = getProduct(id);
  const others = PRODUCTS.filter((item) => item.id !== id).slice(0, 3);

  useEffect(() => {
    document.title = product
      ? `${product.name} — ${SITE.name}`
      : `Item not found — ${SITE.name}`;
  }, [product]);

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] font-mono text-neutral-100 selection:bg-neutral-100 selection:text-[#0a0a0a]">
      <SiteHeader />

      <main className="flex flex-1 items-start justify-center px-6 py-6">
        <div className="mx-auto w-full max-w-3xl">
          {!product ? (
            <div className="py-24 text-center">
              <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-500">
                error 404
              </p>
              <h1 className="mt-6 text-2xl tracking-tight text-neutral-100">
                item not found
              </h1>
              <p className="mx-auto mt-4 max-w-sm text-[13px] leading-relaxed text-neutral-500">
                This item is not in the current catalog. It may have been
                renamed or removed.
              </p>
              <Link
                to="/#products"
                className="glitch-hover mt-9 inline-block border border-white/20 px-6 py-3.5 text-[11px] uppercase tracking-[0.3em] text-neutral-100 transition-colors hover:border-white hover:bg-white hover:text-[#0a0a0a]"
              >
                ← all products
              </Link>
            </div>
          ) : (
            <>
              <nav
                aria-label="breadcrumb"
                className="text-[10px] uppercase tracking-[0.3em] text-neutral-500"
              >
                <Link
                  to="/#products"
                  className="transition-colors hover:text-neutral-200"
                >
                  products
                </Link>
                <span className="mx-2 text-neutral-700">/</span>
                <span className="text-neutral-300">{product.sku}</span>
              </nav>

              <h1 className="mt-7 text-2xl tracking-tight text-neutral-100 sm:text-3xl">
                {product.name}
              </h1>
              <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-neutral-500">
                {product.summary}
              </p>

              <dl className="mt-10 grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-4">
                {(
                  [
                    ["sku", product.sku],
                    ["category", product.category],
                    ["price", product.price],
                    ["released", product.released],
                  ] as Array<[string, string]>
                ).map(([label, value]) => (
                  <div key={label} className="bg-[#0a0a0a] px-4 py-5 sm:px-5">
                    <dt className="text-[9px] uppercase tracking-[0.3em] text-neutral-500">
                      {label}
                    </dt>
                    <dd className="mt-2.5 text-xs tabular-nums text-neutral-200">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              {product.image && (
                <figure className="mt-10 border border-white/10">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="block w-full"
                  />
                </figure>
              )}

              <section className="mt-12" aria-label="details">
                <h2 className="text-[10px] uppercase tracking-[0.35em] text-neutral-500">
                  details
                </h2>
                <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-neutral-400">
                  {product.description}
                </p>
              </section>

              <div className="mt-10 flex flex-wrap items-center gap-6">
                <a
                  href={product.url || SITE.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glitch-hover border border-white/20 px-6 py-3.5 text-[11px] uppercase tracking-[0.3em] text-neutral-100 transition-colors hover:border-white hover:bg-white hover:text-[#0a0a0a]"
                >
                  open in the imvu store ↗
                </a>
                <Link
                  to="/#products"
                  className="glitch-hover text-[11px] uppercase tracking-[0.3em] text-neutral-500 transition-colors hover:text-neutral-200"
                >
                  ← all products
                </Link>
              </div>

              {others.length > 0 && (
                <section
                  className="mt-16 border-t border-white/10 pt-8"
                  aria-label="more products"
                >
                  <h2 className="text-[10px] uppercase tracking-[0.35em] text-neutral-500">
                    more from the catalog
                  </h2>
                  <ul className="mt-5 divide-y divide-white/10 border-y border-white/10">
                    {others.map((other) => (
                      <li key={other.id}>
                        <Link
                          to={`/products/${other.id}`}
                          className="glitch-hover group flex items-center justify-between gap-4 px-1 py-4 outline-none transition-colors hover:bg-white/[0.03] focus-visible:bg-white/[0.03]"
                        >
                          <span className="flex min-w-0 items-center gap-4">
                            <span className="shrink-0 text-[10px] tabular-nums tracking-[0.3em] text-neutral-500">
                              {other.sku}
                            </span>
                            <span className="truncate text-[13px] text-neutral-300 transition-colors group-hover:text-white">
                              {other.name}
                            </span>
                          </span>
                          <span className="shrink-0 text-[10px] uppercase tracking-[0.3em] text-neutral-500 transition-colors group-hover:text-neutral-200">
                            open →
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

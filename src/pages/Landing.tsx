import { useEffect } from "react";
import { motion } from "framer-motion";
import { BinaryMark } from "@/components/BinaryMark";
import { Countdown } from "@/components/Countdown";
import { ProductsSection } from "@/components/ProductsSection";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE } from "@/lib/store";

const SUPPORT_LINKS = [
  { label: "support", href: "mailto:support@xr.studio" },
  { label: "contact", href: "mailto:hello@xr.studio" },
  { label: "status", href: "#" },
  { label: "docs", href: "#" },
  { label: "faq", href: "#" },
];

export default function Landing() {
  useEffect(() => {
    document.title = `${SITE.name} — IMVU storefront`;
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] font-mono text-neutral-100 selection:bg-neutral-100 selection:text-[#0a0a0a]">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-14">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-14 sm:gap-16">
          {/* The mark: 0s and 1s assembling your logo or wordmark */}
          <div className="flex w-full flex-col items-center gap-7">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-[clamp(240px,42vh,440px)] w-full"
            >
              <BinaryMark
                text={SITE.maskText}
                imageSrc={SITE.maskImage || undefined}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="max-w-xl text-center"
            >
              <h1 className="text-[11px] uppercase tracking-[0.45em] text-neutral-200">
                {SITE.name} storefront
              </h1>
              <p className="mt-4 text-[13px] leading-relaxed text-neutral-500">
                A catalogued storefront for IMVU products. Every item carries
                its SKU, price, and release record — open any one for the full
                page and a direct link into the store.
              </p>
            </motion.div>
          </div>

          {/* Countdown to launch, with an editable target date */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="w-full max-w-3xl"
          >
            <Countdown />
          </motion.div>

          {/* Support links */}
          <motion.nav
            aria-label="support"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12"
          >
            {SUPPORT_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[13px] tracking-[0.12em] text-neutral-300 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {link.label}
              </a>
            ))}
          </motion.nav>

          {/* Catalog */}
          <ProductsSection />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

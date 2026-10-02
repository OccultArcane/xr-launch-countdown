import { useEffect } from "react";
import { motion } from "framer-motion";
import { BinaryMark } from "@/components/BinaryMark";
import { Countdown } from "@/components/Countdown";
import { ProductsSection } from "@/components/ProductsSection";
import { SiteFooter, SiteHeader, FaviconLink } from "@/components/SiteChrome";
import { SITE } from "@/lib/store";

const SUPPORT_SOCIALS = [
  { name: "Pinterest", abbr: "PIN", domain: "pinterest.com" },
  { name: "Instagram", abbr: "IG", domain: "instagram.com" },
];

export default function Landing() {
  useEffect(() => {
    document.title = `${SITE.name} — IMVU storefront`;
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] font-mono text-neutral-100 selection:bg-neutral-100 selection:text-[#0a0a0a]">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-14">
        {" "}
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-14 sm:gap-16">
          <h1 className="sr-only">xr — IMVU storefront</h1>

          {/* The mark: 0s and 1s assembling your logo or wordmark */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-[clamp(240px,42vh,440px)] w-full"
          >
            <BinaryMark
              text={SITE.maskText}
              imageSrc={SITE.maskImage || undefined}
              fallbackImageSrc={SITE.maskImageFallback || undefined}
            />
          </motion.div>

          {/* Countdown to launch, with an editable target date */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="w-full max-w-3xl"
          >
            <Countdown />
          </motion.div>

          {/* Support — direct social channels */}
          <motion.nav
            aria-label="support"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="flex items-center gap-3"
          >
            {SUPPORT_SOCIALS.map((social) => (
              <FaviconLink key={social.domain} {...social} />
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

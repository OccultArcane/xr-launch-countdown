import { Fragment, useEffect } from "react";
import { motion } from "framer-motion";
import { BinaryMark } from "@/components/BinaryMark";
import { Countdown } from "@/components/Countdown";
import { MarkWithProducts } from "@/components/ProductsSection";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE } from "@/lib/store";

const SUPPORT_SOCIALS = [
  { name: "Pinterest", domain: "pinterest.com" },
  { name: "Instagram", domain: "instagram.com" },
];

export default function Landing() {
  useEffect(() => {
    document.title = `${SITE.name} — IMVU storefront`;
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] font-mono text-neutral-100 selection:bg-neutral-100 selection:text-[#0a0a0a]">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-14 sm:gap-16">
          <h1 className="sr-only">xr — IMVU storefront</h1>

          {/* Mark, catalog and countdown kept tight together */}
          <div className="flex w-full flex-col items-center gap-6 sm:gap-8">
            <MarkWithProducts>
              <BinaryMark
                text={SITE.maskText}
                fontSrc={SITE.maskFontFile || undefined}
                imageSrc={SITE.maskImage || undefined}
                fallbackImageSrc={SITE.maskImageFallback || undefined}
              />
            </MarkWithProducts>

            {/* Countdown to the weekly Friday drop */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
              className="w-full max-w-3xl"
            >
              <Countdown />
            </motion.div>
          </div>

          {/* Support — direct social channels */}
          <motion.nav
            aria-label="support"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="flex flex-wrap items-center justify-center gap-x-3 text-[13px] tracking-[0.12em]"
          >
            {SUPPORT_SOCIALS.map((social, index) => (
              <Fragment key={social.domain}>
                {index > 0 && (
                  <span aria-hidden="true" className="text-neutral-600">
                    /
                  </span>
                )}
                <a
                  href={`https://${social.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glitch-hover no-underline text-neutral-300 transition-colors hover:text-white"
                >
                  {social.name}
                </a>
              </Fragment>
            ))}
          </motion.nav>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

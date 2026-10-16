import { useEffect } from "react";
import { motion } from "framer-motion";
import { BinaryMark } from "@/components/BinaryMark";
import { Countdown } from "@/components/Countdown";
import { MarkWithProducts } from "@/components/ProductsSection";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Stage } from "@/components/Stage";
import { SITE } from "@/lib/store";

/**
 * Support channels — full URLs, each rendered inside its own brackets
 * ([name]) so the row needs no separator between entries. An empty href
 * renders the name dimmed as inactive (Discord: drop its invite in when
 * the server exists and it goes live).
 */
const SUPPORT_SOCIALS = [
  { name: "Pinterest", href: "https://www.pinterest.com/xrimvu" },
  { name: "Instagram", href: "https://www.instagram.com/xr.imvu/" },
  { name: "Discord", href: "" },
];

export default function Landing() {
  useEffect(() => {
    document.title = `${SITE.name} — IMVU storefront`;
  }, []);

  // The whole page lives inside the fixed 926 × 700 stage: it scales to
  // fit any screen, device or iframe while keeping this exact layout.
  return (
    <Stage>
      <div className="flex flex-col bg-[#0a0a0a] font-mono text-neutral-100 selection:bg-neutral-100 selection:text-[#0a0a0a]">
        <SiteHeader />

        <main className="flex flex-1 items-center justify-center px-6 py-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 @sm:gap-8">
            <h1 className="sr-only">xr — IMVU storefront</h1>

            {/* Mark, catalog and countdown kept tight together */}
            <div className="flex w-full flex-col items-center gap-6 @sm:gap-8">
              <MarkWithProducts>
                <BinaryMark
                  text={SITE.maskText}
                  fontSrc={SITE.maskFontFile || undefined}
                  imageSrc={SITE.maskImage || undefined}
                  fallbackImageSrc={SITE.maskImageFallback || undefined}
                  caption={
                    // Italic slogan in Discord's inactive grey — anchored
                    // under the wordmark and tilting with the mark. The
                    // brand X and R pick up the accent red.
                    <p className="text-center text-[10px] italic tracking-[0.16em] text-neutral-600 @sm:text-[12px] @sm:tracking-[0.2em]">
                      <span className="text-xr-red">X</span>tend your{" "}
                      <span className="text-xr-red">R</span>eality
                    </p>
                  }
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
              {SUPPORT_SOCIALS.map((social) => (
                <span
                  key={social.name}
                  className="inline-flex items-center whitespace-nowrap"
                >
                  <span aria-hidden="true" className="text-neutral-600">
                    [
                  </span>
                  {social.href ? (
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glitch-hover no-underline text-neutral-300 transition-colors hover:text-white"
                    >
                      {social.name}
                    </a>
                  ) : (
                    // No invite yet — dulled and unclickable so it reads
                    // as inactive until its href is filled in.
                    <span
                      aria-disabled="true"
                      title="coming soon"
                      className="cursor-default select-none text-neutral-600"
                    >
                      {social.name}
                    </span>
                  )}
                  <span aria-hidden="true" className="text-neutral-600">
                    ]
                  </span>
                </span>
              ))}
            </motion.nav>
          </div>
        </main>

        <SiteFooter />
      </div>
    </Stage>
  );
}

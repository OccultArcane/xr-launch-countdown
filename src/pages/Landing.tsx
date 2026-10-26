import { useEffect } from "react";
import { motion } from "framer-motion";
import { BinaryMark } from "@/components/BinaryMark";
import { Countdown } from "@/components/Countdown";
import { CreatorAvatar } from "@/components/CreatorAvatar";
import { MarkWithProducts } from "@/components/ProductsSection";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Stage } from "@/components/Stage";
import { SUPPORTED_CREATORS } from "@/lib/links";
import { SITE } from "@/lib/store";

export default function Landing() {
  useEffect(() => {
    document.title = `${SITE.name} — IMVU storefront`;
  }, []);

  // The page fills the viewport: header on the top edge, footer on the
  // bottom edge, and the storefront column taking all the space between
  // them, sized by the stage's container queries rather than a scale
  // factor.
  return (
    <Stage>
      <div className="flex flex-1 flex-col bg-[#0a0a0a] font-mono text-neutral-100 selection:bg-neutral-100 selection:text-[#0a0a0a]">
        <SiteHeader />

        <main className="flex min-h-0 flex-1 items-center justify-center px-[clamp(0.75rem,3vw,3rem)] py-[clamp(0.5rem,1.6vh,1.5rem)]">
          {/* self-stretch + min-h-0: the column takes the height the header
              and footer leave, and the block below can hand what it doesn't
              need to the mark — that is what keeps the page filling the
              window at any size instead of leaving a gap or overflowing. */}
          <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-[clamp(0.75rem,2.4vh,2rem)] self-stretch">
            <h1 className="sr-only">xr — IMVU storefront</h1>

            {/* Mark, catalog and countdown kept tight together */}
            <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-[clamp(0.75rem,2.4vh,2rem)]">
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
                    <p className="text-center text-[clamp(10px,1.1vmin,14px)] italic tracking-[clamp(0.14em,0.5vw,0.2em)] text-neutral-600">
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
                className="w-full"
              >
                <Countdown />
              </motion.div>
            </div>

            {/* Support — the creators the studio backs, each with their
                avatar in a bracketed chip that links into their IMVU shop */}
            <motion.section
              aria-label="supported creators"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <p className="text-[clamp(9px,1.05vmin,12px)] uppercase tracking-[clamp(0.28em,1vw,0.4em)] text-neutral-500">
                {/* "Shop" carries the same red as the countdown label, the
                    drop date and the DMCA line. */}
                <span className="text-xr-red">Shop</span> these creators
              </p>

              <div className="mt-[clamp(0.375rem,1.2vh,0.875rem)] flex flex-wrap items-center justify-center gap-[clamp(0.375rem,1vmin,0.875rem)]">
                {/* The link's box is the hover target, and it never moves: the
                    bump happens on the layer inside it. Sliding the link itself
                    put its edge out from under a cursor sitting on the border,
                    which dropped the hover, slid the link back under that
                    cursor, and repeated — a flicker along that border. */}
                {SUPPORTED_CREATORS.map((creator) => (
                  <a
                    key={creator.id}
                    href={creator.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative inline-flex outline-none"
                  >
                    <span className="viewfinder inline-flex items-center gap-[clamp(0.25rem,0.8vmin,0.5rem)] bg-[#0a0a0a] py-[clamp(0.125rem,0.6vh,0.375rem)] pr-[clamp(0.5rem,1vw,0.75rem)] pl-[clamp(0.25rem,0.6vw,0.5rem)] transition-[transform,background-color] duration-150 group-hover:-translate-x-1 group-hover:bg-white/[0.04]">
                      {/* Decorative — the name beside it is the link's
                          text — and kept current with IMVU on its own, so a
                          creator's new picture lands without a rebuild (see
                          CreatorAvatar). */}
                      <CreatorAvatar creator={creator} />
                      {/* The name carries the same red as "Shop" in the label
                          above; the brackets stay neutral so the accent sits on
                          the name alone. */}
                      <span className="inline-flex items-center whitespace-nowrap text-[clamp(11px,1.3vmin,15px)] tracking-[0.12em] text-xr-red transition-colors group-hover:text-white">
                        <span aria-hidden="true" className="text-neutral-600">
                          [
                        </span>
                        {creator.label}
                        <span aria-hidden="true" className="text-neutral-600">
                          ]
                        </span>
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </motion.section>
          </div>
        </main>

        <SiteFooter />
      </div>
    </Stage>
  );
}
